import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const stockFilter = url.searchParams.get("stock");

  let query = supabase
    .from("products")
    .select("id, name, name_en, sku, category, product_class, current_stock, selling_price, cost_price_jpy")
    .order("current_stock", { ascending: true });

  if (category) {
    query = query.eq("category", category);
  }
  if (stockFilter === "zero") {
    query = query.eq("current_stock", 0);
  } else if (stockFilter === "low") {
    query = query.lte("current_stock", 5).gt("current_stock", 0);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const products = data || [];
  const totalStock = products.reduce((s, p) => s + (p.current_stock || 0), 0);
  const totalValue = products.reduce(
    (s, p) =>
      s + (p.current_stock || 0) * Number(p.cost_price_jpy || p.selling_price || 0),
    0
  );
  const zeroStock = products.filter((p) => (p.current_stock || 0) === 0).length;
  const lowStock = products.filter(
    (p) => (p.current_stock || 0) > 0 && (p.current_stock || 0) <= 5
  ).length;

  return NextResponse.json({
    products,
    summary: {
      totalProducts: products.length,
      totalStock,
      totalValue,
      zeroStock,
      lowStock,
    },
  });
}
