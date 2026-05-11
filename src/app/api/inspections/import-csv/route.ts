import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 });
  }

  const text = await file.text();
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) {
    return NextResponse.json({ error: "データが空です" }, { status: 400 });
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const skuIdx = findIdx(headers, ["sku", "商品コード", "product_code"]);
  const goodIdx = findIdx(headers, ["good_quantity", "良品数", "良品", "good"]);
  const defectIdx = findIdx(headers, ["defective_quantity", "不良品数", "不良品", "defective"]);
  const missingIdx = findIdx(headers, ["missing_quantity", "未着数", "未着", "missing"]);
  const notesIdx = findIdx(headers, ["notes", "備考", "メモ"]);

  if (skuIdx < 0 || goodIdx < 0) {
    return NextResponse.json({
      error: "必須列が見つかりません。SKU, 良品数が必要です。",
      foundHeaders: headers,
    }, { status: 400 });
  }

  const { data: products } = await supabase.from("products").select("id, sku");
  const skuMap = new Map((products || []).map((p) => [p.sku, p.id]));

  const { data: activeOrders } = await supabase
    .from("orders")
    .select("id, product_id, status")
    .not("status", "eq", "完了");
  const orderByProduct = new Map((activeOrders || []).map((o) => [o.product_id, o]));

  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const cols = parseCsvLine(lines[i + 1]);
    const sku = cols[skuIdx]?.trim();
    const productId = skuMap.get(sku);

    if (!productId) {
      errors.push(`行${i + 2}: SKU "${sku}" が未登録`);
      continue;
    }

    const good = parseInt(cols[goodIdx]) || 0;
    const defective = defectIdx >= 0 ? parseInt(cols[defectIdx]) || 0 : 0;
    const missing = missingIdx >= 0 ? parseInt(cols[missingIdx]) || 0 : 0;
    const notes = notesIdx >= 0 ? cols[notesIdx]?.trim() || null : null;

    const order = orderByProduct.get(productId);

    const { data: inspection, error } = await supabase
      .from("inspections")
      .insert({
        order_id: order?.id || null,
        product_id: productId,
        inspected_quantity: good + defective + missing,
        good_quantity: good,
        defective_quantity: defective,
        missing_quantity: missing,
        notes,
        inspected_by: "csv_import",
      })
      .select()
      .single();

    if (error) {
      errors.push(`行${i + 2}: ${error.message}`);
      continue;
    }

    if (good > 0) {
      await supabase.from("inventory_transactions").insert({
        product_id: productId,
        type: "入荷",
        quantity: good,
        reference_id: inspection.id,
        notes: `CSVインポート検品: 良品${good}個`,
        created_by: "csv_import",
      });
    }

    if (order) {
      await supabase.from("orders").update({ status: "完了" }).eq("id", order.id);
      await supabase.from("order_status_history").insert({
        order_id: order.id,
        from_status: order.status,
        to_status: "完了",
        changed_by: "csv_import",
        comment: `CSVインポート検品 良品:${good} 不良:${defective} 未着:${missing}`,
      });
    }

    created++;
  }

  return NextResponse.json({ created, errors });
}

function findIdx(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.indexOf(c);
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
