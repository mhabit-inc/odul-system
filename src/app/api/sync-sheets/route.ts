import { supabase } from "@/lib/supabase";
import { fetchProductMaster } from "@/lib/google-sheets";
import { NextResponse } from "next/server";

const FIELD_MAP: Record<string, string> = {
  "SKU": "sku",
  "商品名": "name",
  "商品名（英語）": "name_en",
  "カテゴリー": "category",
  "素材": "material",
  "カラー": "color",
  "石1": "stone_1",
  "石2": "stone_2",
  "石3": "stone_3",
  "原価(INR)": "cost_price_inr",
  "為替レート": "exchange_rate",
  "原価(JPY)": "cost_price_jpy",
  "販売価格": "selling_price",
  "サイズ展開": "size_options",
};

export async function POST() {
  try {
    const rows = await fetchProductMaster();

    if (rows.length === 0) {
      return NextResponse.json({ synced: 0, message: "シートにデータがありません" });
    }

    let synced = 0;
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const sku = row["SKU"]?.trim();
      if (!sku) continue;

      const product: Record<string, unknown> = { sku };
      for (const [sheetCol, dbCol] of Object.entries(FIELD_MAP)) {
        if (sheetCol === "SKU") continue;
        const val = row[sheetCol]?.trim();
        if (val) {
          if (["cost_price_inr", "exchange_rate", "cost_price_jpy", "selling_price"].includes(dbCol)) {
            const num = parseFloat(val.replace(/,/g, ""));
            if (!isNaN(num)) product[dbCol] = num;
          } else {
            product[dbCol] = val;
          }
        }
      }

      if (!product.name && !product.name_en) {
        errors.push(`SKU ${sku}: 商品名なし`);
        continue;
      }
      if (!product.category) product.category = "未分類";
      if (!product.selling_price) {
        errors.push(`SKU ${sku}: 販売価格なし`);
        continue;
      }

      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("sku", sku)
        .single();

      if (existing) {
        await supabase.from("products").update(product).eq("id", existing.id);
        updated++;
      } else {
        await supabase.from("products").insert(product);
        created++;
      }
      synced++;
    }

    return NextResponse.json({
      synced,
      created,
      updated,
      errors: errors.length > 0 ? errors : undefined,
      total_rows: rows.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
