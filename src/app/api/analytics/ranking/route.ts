import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const months = parseInt(url.searchParams.get("months") || "3");
  const sortBy = url.searchParams.get("sort") || "revenue";

  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const sinceStr = since.toISOString();

  const { data: sales } = await supabase
    .from("sales")
    .select("product_id, quantity, revenue")
    .gte("sold_at", sinceStr);

  const { data: products } = await supabase
    .from("products")
    .select("id, name, name_en, sku, category, product_class, selling_price, cost_price_jpy, current_stock");

  const productMap = new Map(
    (products || []).map((p) => [p.id, p])
  );

  const ranking: Record<string, { revenue: number; quantity: number }> = {};
  for (const s of sales || []) {
    if (!ranking[s.product_id]) ranking[s.product_id] = { revenue: 0, quantity: 0 };
    ranking[s.product_id].revenue += Number(s.revenue || 0);
    ranking[s.product_id].quantity += s.quantity || 0;
  }

  const results = Object.entries(ranking)
    .map(([productId, data]) => {
      const product = productMap.get(productId);
      if (!product) return null;
      const costPrice = Number(product.cost_price_jpy || 0);
      const grossProfit = data.revenue - costPrice * data.quantity;
      return {
        productId,
        name: product.name || product.name_en || "不明",
        sku: product.sku,
        category: product.category,
        productClass: product.product_class,
        revenue: data.revenue,
        quantity: data.quantity,
        grossProfit,
        grossMargin: data.revenue > 0 ? (grossProfit / data.revenue) * 100 : 0,
        currentStock: product.current_stock || 0,
        avgPrice: data.quantity > 0 ? Math.round(data.revenue / data.quantity) : 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (sortBy === "quantity") return b!.quantity - a!.quantity;
      if (sortBy === "profit") return b!.grossProfit - a!.grossProfit;
      return b!.revenue - a!.revenue;
    })
    .slice(0, 50);

  return NextResponse.json(results);
}
