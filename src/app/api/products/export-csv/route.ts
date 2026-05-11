import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

function escCsv(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const ALL_COLUMNS: { key: string; label: string }[] = [
  { key: "sku", label: "SKU" },
  { key: "name", label: "商品名" },
  { key: "name_en", label: "商品名(EN)" },
  { key: "category", label: "カテゴリー" },
  { key: "product_class", label: "分類" },
  { key: "material", label: "素材" },
  { key: "collection_name", label: "コレクション" },
  { key: "selling_price", label: "販売価格" },
  { key: "cost_price_jpy", label: "原価(JPY)" },
  { key: "current_stock", label: "現在庫" },
  { key: "vendor", label: "Vendor" },
  { key: "launched_at", label: "発売日" },
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const colsParam = url.searchParams.get("cols");
  const classFilter = url.searchParams.get("class");

  const selectedKeys = colsParam
    ? colsParam.split(",").filter((k) => ALL_COLUMNS.some((c) => c.key === k))
    : ALL_COLUMNS.map((c) => c.key);

  const columns = ALL_COLUMNS.filter((c) => selectedKeys.includes(c.key));

  let query = supabase.from("products").select("*").order("sku");
  if (classFilter) {
    query = query.eq("product_class", classFilter);
  }

  const { data } = await query;
  const products = data || [];

  const headers = columns.map((c) => c.label);
  const rows = products.map((p) =>
    columns.map((c) => escCsv((p as Record<string, unknown>)[c.key])).join(",")
  );

  const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
