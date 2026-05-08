import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const months = parseInt(url.searchParams.get("months") || "3");

  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const [salesRes, productsRes] = await Promise.all([
    supabase
      .from("sales")
      .select("product_id, quantity, revenue")
      .gte("sold_at", since.toISOString()),
    supabase
      .from("products")
      .select("id, name, name_en, sku, category, product_class, current_stock, cost_price_jpy"),
  ]);

  const productMap = new Map(
    (productsRes.data || []).map((p) => [p.id, p])
  );

  const salesByProduct: Record<string, { quantity: number; revenue: number }> = {};
  for (const s of salesRes.data || []) {
    if (!salesByProduct[s.product_id]) salesByProduct[s.product_id] = { quantity: 0, revenue: 0 };
    salesByProduct[s.product_id].quantity += s.quantity;
    salesByProduct[s.product_id].revenue += Number(s.revenue || 0);
  }

  const results = Object.entries(salesByProduct)
    .map(([productId, sales]) => {
      const product = productMap.get(productId);
      if (!product) return null;

      const costPrice = Number(product.cost_price_jpy || 0);
      const currentStock = product.current_stock || 0;
      const avgInventory = currentStock > 0 ? currentStock : 1;
      const cogs = costPrice * sales.quantity;
      const annualizedCogs = (cogs / months) * 12;
      const avgInventoryValue = avgInventory * costPrice;
      const turnoverRate = avgInventoryValue > 0 ? annualizedCogs / avgInventoryValue : 0;
      const daysOfSupply = sales.quantity > 0
        ? (currentStock / (sales.quantity / (months * 30))) : 999;

      return {
        productId,
        name: product.name || product.name_en || "不明",
        sku: product.sku,
        category: product.category,
        productClass: product.product_class,
        currentStock,
        salesQuantity: sales.quantity,
        cogs,
        turnoverRate: Math.round(turnoverRate * 10) / 10,
        daysOfSupply: Math.min(999, Math.round(daysOfSupply)),
        inventoryValue: currentStock * costPrice,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a!.turnoverRate - b!.turnoverRate);

  const totalInventoryValue = results.reduce((s, r) => s + r!.inventoryValue, 0);
  const totalCogs = results.reduce((s, r) => s + r!.cogs, 0);
  const avgTurnover = totalInventoryValue > 0
    ? ((totalCogs / months) * 12) / totalInventoryValue : 0;

  return NextResponse.json({
    summary: {
      avgTurnover: Math.round(avgTurnover * 10) / 10,
      totalInventoryValue,
      totalCogs,
      productCount: results.length,
    },
    products: results,
  });
}
