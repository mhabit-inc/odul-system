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
  const qtyIdx = findIdx(headers, ["quantity", "数量", "qty", "発注数"]);
  const costIdx = findIdx(headers, ["unit_cost", "単価", "原価"]);
  const supplierIdx = findIdx(headers, ["supplier", "仕入先", "supplier_code"]);
  const deliveryIdx = findIdx(headers, ["expected_delivery", "納期", "予定納期"]);
  const notesIdx = findIdx(headers, ["notes", "備考", "メモ"]);

  if (skuIdx < 0 || qtyIdx < 0) {
    return NextResponse.json({
      error: "必須列が見つかりません。SKU, 数量が必要です。",
      foundHeaders: headers,
    }, { status: 400 });
  }

  const { data: products } = await supabase.from("products").select("id, sku");
  const skuMap = new Map((products || []).map((p) => [p.sku, p.id]));

  const { data: suppliers } = await supabase.from("suppliers").select("id, code, name");
  const supplierMap = new Map((suppliers || []).map((s) => [s.code, s.id]));

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

    const quantity = parseInt(cols[qtyIdx]) || 0;
    if (quantity <= 0) continue;

    const unitCost = costIdx >= 0 ? parseInt(cols[costIdx]) || 0 : 0;
    const supplierCode = supplierIdx >= 0 ? cols[supplierIdx]?.trim() : "";
    const supplierId = supplierCode ? supplierMap.get(supplierCode) || null : null;
    const expectedDelivery = deliveryIdx >= 0 ? cols[deliveryIdx]?.trim() || null : null;
    const notes = notesIdx >= 0 ? cols[notesIdx]?.trim() || null : null;

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        product_id: productId,
        supplier_id: supplierId,
        quantity,
        unit_cost: unitCost,
        total_cost: unitCost * quantity,
        status: "発注準備",
        expected_delivery: expectedDelivery,
        notes,
      })
      .select()
      .single();

    if (error) {
      errors.push(`行${i + 2}: ${error.message}`);
      continue;
    }

    await supabase.from("order_status_history").insert({
      order_id: order.id,
      to_status: "発注準備",
      changed_by: "csv_import",
      comment: "CSVインポートで作成",
    });

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
