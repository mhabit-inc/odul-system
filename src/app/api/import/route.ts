import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string;

  if (!file) {
    return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 });
  }

  const text = await file.text();
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) {
    return NextResponse.json({ error: "データが空です" }, { status: 400 });
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());

  if (type === "sales") {
    return importSales(headers, lines.slice(1));
  } else if (type === "ad_costs") {
    return importAdCosts(headers, lines.slice(1));
  }

  return NextResponse.json({ error: "無効なインポートタイプです" }, { status: 400 });
}

async function importSales(headers: string[], dataLines: string[]) {
  const skuIdx = findIdx(headers, ["sku", "商品コード", "product_code"]);
  const qtyIdx = findIdx(headers, ["quantity", "数量", "qty"]);
  const revenueIdx = findIdx(headers, ["revenue", "売上", "売上金額", "amount"]);
  const dateIdx = findIdx(headers, ["date", "sold_at", "日付", "販売日"]);
  const channelIdx = findIdx(headers, ["channel", "チャネル", "販売チャネル"]);

  if (skuIdx < 0 || qtyIdx < 0 || revenueIdx < 0) {
    return NextResponse.json({
      error: "必須列が見つかりません。SKU, 数量, 売上が必要です。",
      foundHeaders: headers,
    }, { status: 400 });
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, sku");

  const skuMap = new Map((products || []).map((p) => [p.sku, p.id]));

  const rows = [];
  const errors: string[] = [];
  let skipped = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const cols = parseCsvLine(dataLines[i]);
    const sku = cols[skuIdx]?.trim();
    const productId = skuMap.get(sku);

    if (!productId) {
      skipped++;
      if (skipped <= 5) errors.push(`行${i + 2}: SKU "${sku}" が見つかりません`);
      continue;
    }

    rows.push({
      product_id: productId,
      quantity: parseInt(cols[qtyIdx]) || 0,
      revenue: parseInt(cols[revenueIdx]) || 0,
      sold_at: dateIdx >= 0 && cols[dateIdx] ? new Date(cols[dateIdx].trim()).toISOString() : new Date().toISOString(),
      channel: channelIdx >= 0 && cols[channelIdx] ? cols[channelIdx].trim() : "shopify",
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "インポート可能なデータがありません", errors }, { status: 400 });
  }

  const batchSize = 500;
  let imported = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from("sales").insert(batch);
    if (error) {
      return NextResponse.json({ error: error.message, imported }, { status: 500 });
    }
    imported += batch.length;
  }

  return NextResponse.json({ imported, skipped, errors });
}

async function importAdCosts(headers: string[], dataLines: string[]) {
  const dateIdx = findIdx(headers, ["date", "日付"]);
  const channelIdx = findIdx(headers, ["channel", "チャネル", "媒体"]);
  const spendIdx = findIdx(headers, ["spend", "費用", "広告費", "cost"]);
  const impIdx = findIdx(headers, ["impressions", "表示回数", "imp"]);
  const clickIdx = findIdx(headers, ["clicks", "クリック数", "click"]);
  const convIdx = findIdx(headers, ["conversions", "コンバージョン", "cv"]);
  const revIdx = findIdx(headers, ["conversion_revenue", "cv売上", "売上"]);
  const campaignIdx = findIdx(headers, ["campaign", "campaign_name", "キャンペーン"]);

  if (dateIdx < 0 || spendIdx < 0) {
    return NextResponse.json({
      error: "必須列が見つかりません。日付, 費用が必要です。",
      foundHeaders: headers,
    }, { status: 400 });
  }

  const rows = [];
  for (let i = 0; i < dataLines.length; i++) {
    const cols = parseCsvLine(dataLines[i]);
    const dateVal = cols[dateIdx]?.trim();
    if (!dateVal) continue;

    rows.push({
      date: dateVal,
      channel: channelIdx >= 0 ? cols[channelIdx]?.trim() || "meta" : "meta",
      spend: parseInt(cols[spendIdx]) || 0,
      impressions: impIdx >= 0 ? parseInt(cols[impIdx]) || 0 : 0,
      clicks: clickIdx >= 0 ? parseInt(cols[clickIdx]) || 0 : 0,
      conversions: convIdx >= 0 ? parseInt(cols[convIdx]) || 0 : 0,
      conversion_revenue: revIdx >= 0 ? parseInt(cols[revIdx]) || 0 : 0,
      campaign_name: campaignIdx >= 0 ? cols[campaignIdx]?.trim() || null : null,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "インポート可能なデータがありません" }, { status: 400 });
  }

  const batchSize = 500;
  let imported = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from("ad_costs").insert(batch);
    if (error) {
      return NextResponse.json({ error: error.message, imported }, { status: 500 });
    }
    imported += batch.length;
  }

  return NextResponse.json({ imported });
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
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
