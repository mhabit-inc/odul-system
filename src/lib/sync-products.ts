import { createAdminClient } from "./supabase";
import { fetchProductMaster } from "./google-sheets";

// スプレッドシートの列名 → DBカラムのマッピング
// ヘッダーに改行が含まれるため、改行を除去した名前で照合する
const COLUMN_MAP: Record<string, string> = {
  SKU: "sku",
  "商品名(英語)": "name_en",
  コレクション: "collection_name",
  hear: "category",
  地金素材: "material",
  地材カラー: "color",
  "石の種類①": "stone_1",
  "石の種類②": "stone_2",
  "石の種類③": "stone_3",
  "販売価格(税込)": "selling_price",
  発売開始日: "launched_at",
  "写真URL": "image_url",
  "サイズ(リング)": "size_options",
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

  const productsToUpsert: Record<string, unknown>[] = [];

  for (const row of rows) {
    const sku = row["SKU"]?.trim();
    if (!sku) {
      result.skipped++;
      continue;
    }

    const product: Record<string, unknown> = {
      sku,
      synced_at: new Date().toISOString(),
    };

    for (const [sheetCol, dbCol] of Object.entries(COLUMN_MAP)) {
      const value = row[sheetCol];
      if (value === undefined || value === "") continue;

      switch (dbCol) {
        case "selling_price":
          product[dbCol] = parseFloat(value.replace(/[,¥₹]/g, "")) || 0;
          break;
        case "launched_at":
          product[dbCol] = parseDate(value);
          break;
        case "sku":
          break;
        default:
          product[dbCol] = value;
      }
    }

    // name_enをnameとして使う
    product["name"] = product["name_en"] || product["collection_name"] || sku;
    if (product["name_en"]) product["name_en"] = product["name_en"];
    delete product["collection_name"];

    if (!product["selling_price"]) {
      product["selling_price"] = 0;
    }

    if (!product["category"]) {
      product["category"] = "その他";
    }

    productsToUpsert.push(product);
  }

  // バッチでupsert（100件ずつ）
  const BATCH_SIZE = 100;
  for (let i = 0; i < productsToUpsert.length; i += BATCH_SIZE) {
    const batch = productsToUpsert.slice(i, i + BATCH_SIZE);
    const { error, count } = await supabase
      .from("products")
      .upsert(batch, { onConflict: "sku" });

    if (error) {
      result.errors.push(`Batch ${i / BATCH_SIZE}: ${error.message}`);
    } else {
      result.inserted += batch.length;
    }
  }

  result.skipped = result.total - productsToUpsert.length;

  return result;
}

function parseDate(value: string): string | null {
  if (!value) return null;

  const match = value.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}
