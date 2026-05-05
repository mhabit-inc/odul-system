import { createAdminClient } from "./supabase";
import { fetchProductMaster } from "./google-sheets";

// スプレッドシートの列名 → DBカラムのマッピング
// 実際のスプレッドシートのヘッダー名に合わせて調整が必要
const COLUMN_MAP: Record<string, string> = {
  SKU: "sku",
  商品名: "name",
  "商品名(英語)": "name_en",
  カテゴリー: "category",
  地金素材: "material",
  地金カラー: "color",
  "石の種類①": "stone_1",
  "石の種類②": "stone_2",
  "石の種類③": "stone_3",
  "制作原価(INR)": "cost_price_inr",
  為替: "exchange_rate",
  "制作原価(円)": "cost_price_jpy",
  "販売価格(税込)": "selling_price",
  サイズ: "size_options",
  発売開始日: "launched_at",
  コレクション: "collection",
  写真URL: "image_url",
};

type SyncResult = {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export async function syncProducts(): Promise<SyncResult> {
  const supabase = createAdminClient();
  const rows = await fetchProductMaster();

  const result: SyncResult = {
    total: rows.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const row of rows) {
    const sku = row["SKU"]?.trim();
    if (!sku) {
      result.skipped++;
      continue;
    }

    const product: Record<string, unknown> = {
      synced_at: new Date().toISOString(),
    };

    for (const [sheetCol, dbCol] of Object.entries(COLUMN_MAP)) {
      const value = row[sheetCol];
      if (value === undefined || value === "") continue;

      switch (dbCol) {
        case "cost_price_inr":
        case "exchange_rate":
        case "cost_price_jpy":
        case "selling_price":
          product[dbCol] = parseFloat(value.replace(/[,¥₹]/g, "")) || null;
          break;
        case "launched_at":
          product[dbCol] = parseDate(value);
          break;
        default:
          product[dbCol] = value;
      }
    }

    if (!product["name"] || !product["selling_price"]) {
      result.skipped++;
      continue;
    }

    if (!product["category"]) {
      product["category"] = "その他";
    }

    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("sku", sku)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("products")
        .update(product)
        .eq("sku", sku);

      if (error) {
        result.errors.push(`UPDATE ${sku}: ${error.message}`);
      } else {
        result.updated++;
      }
    } else {
      const { error } = await supabase
        .from("products")
        .insert({ ...product, sku });

      if (error) {
        result.errors.push(`INSERT ${sku}: ${error.message}`);
      } else {
        result.inserted++;
      }
    }
  }

  return result;
}

function parseDate(value: string): string | null {
  if (!value) return null;

  // "2026/1/15" or "2026-01-15" format
  const match = value.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}
