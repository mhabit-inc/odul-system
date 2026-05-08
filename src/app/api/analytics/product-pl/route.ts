import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const months = parseInt(url.searchParams.get("months") || "3");

  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const sinceStr = since.toISOString();
  const sinceDateStr = sinceStr.slice(0, 10);

  const [salesRes, productsRes, adCostsRes] = await Promise.all([
    supabase
      .from("sales")
      .select("product_id, quantity, revenue")
      .gte("sold_at", sinceStr),
    supabase
      .from("products")
      .select("id, name, name_en, sku, category, product_class, cost_price_jpy, selling_price, current_stock"),
    supabase
      .from("ad_costs")
      .select("product_id, spend")
      .gte("date", sinceDateStr),
  ]);

  const productMap = new Map(
    (productsRes.data || []).map((p) => [p.id, p])
  );

  const salesByProduct: Record<string, { revenue: number; quantity: number }> = {};
  for (const s of salesRes.data || []) {
    if (!salesByProduct[s.product_id]) salesByProduct[s.product_id] = { revenue: 0, quantity: 0 };
    salesByProduct[s.product_id].revenue += Number(s.revenue || 0);
    salesByProduct[s.product_id].quantity += s.quantity || 0;
  }

  const adByProduct: Record<string, number> = {};
  for (const a of adCostsRes.data || []) {
    if (a.product_id) {
      adByProduct[a.product_id] = (adByProduct[a.product_id] || 0) + Number(a.spend || 0);
    }
  }

  const totalAdSpendUnallocated = (adCostsRes.data || [])
    .filter((a) => !a.product_id)
    .reduce((s, a) => s + Number(a.spend || 0), 0);

  const productIds = new Set([
    ...Object.keys(salesByProduct),
    ...Object.keys(adByProduct),
  ]);

  const results = Array.from(productIds)
    .map((productId) => {
      const product = productMap.get(productId);
      if (!product) return null;
      const sales = salesByProduct[productId] || { revenue: 0, quantity: 0 };
      const costPrice = Number(product.cost_price_jpy || 0);
      const cogs = costPrice * sales.quantity;
      const grossProfit = sales.revenue - cogs;
      const adSpend = adByProduct[productId] || 0;
      const operatingProfit = grossProfit - adSpend;

      return {
        productId,
        name: product.name || product.name_en || "不明",
        sku: product.sku,
        category: product.category,
        productClass: product.product_class,
        revenue: sales.revenue,
        quantity: sales.quantity,
        cogs,
        grossProfit,
        grossMargin: sales.revenue > 0 ? (grossProfit / sales.revenue) * 100 : 0,
        adSpend,
        operatingProfit,
        operatingMargin: sales.revenue > 0 ? (operatingProfit / sales.revenue) * 100 : 0,
        currentStock: product.current_stock || 0,
        inventoryValue: (product.current_stock || 0) * costPrice,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.operatingProfit - a!.operatingProfit);

  const totalRevenue = results.reduce((s, r) => s + r!.revenue, 0);
  const totalCogs = results.reduce((s, r) => s + r!.cogs, 0);
  const totalAdSpend = results.reduce((s, r) => s + r!.adSpend, 0) + totalAdSpendUnallocated;

  return NextResponse.json({
    summary: {
      totalRevenue,
      totalCogs,
      totalGrossProfit: totalRevenue - totalCogs,
      totalAdSpend,
      totalOperatingProfit: totalRevenue - totalCogs - totalAdSpend,
      unallocatedAdSpend: totalAdSpendUnallocated,
    },
    products: results,
  });
}
