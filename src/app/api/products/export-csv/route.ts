import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

function escCsv(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const { data } = await supabase
    .from("products")
    .select("*")
    .order("sku");

  const products = data || [];
  const headers = [
    "SKU", "商品名", "商品名(EN)", "カテゴリー", "分類",
    "素材", "コレクション", "販売価格", "原価(JPY)", "現在庫",
    "Vendor", "発売日",
  ];

  const rows = products.map((p) => [
    p.sku, p.name, p.name_en, p.category, p.product_class,
    p.material, p.collection_name, p.selling_price, p.cost_price_jpy,
    p.current_stock, p.vendor, p.launched_at,
  ].map(escCsv).join(","));

  const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
