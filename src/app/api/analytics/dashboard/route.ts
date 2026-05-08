import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const months = parseInt(url.searchParams.get("months") || "3");

  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const sinceStr = since.toISOString();

  const [salesRes, productsRes, alertsRes, salesByMonthRes, salesByCategoryRes] =
    await Promise.all([
      supabase
        .from("sales")
        .select("quantity, revenue")
        .gte("sold_at", sinceStr),
      supabase
        .from("products")
        .select("id, category, product_class, current_stock, selling_price, cost_price_jpy"),
      supabase
        .from("reorder_alerts")
        .select("alert_level"),
      supabase
        .from("sales")
        .select("sold_at, revenue, quantity")
        .gte("sold_at", sinceStr)
        .order("sold_at"),
      supabase
        .from("sales")
        .select("product_id, revenue")
        .gte("sold_at", sinceStr),
    ]);

  const sales = salesRes.data || [];
  const products = productsRes.data || [];
  const alerts = alertsRes.data || [];

  const totalRevenue = sales.reduce((sum, s) => sum + Number(s.revenue), 0);
  const totalQuantity = sales.reduce((sum, s) => sum + s.quantity, 0);
  const totalStock = products.reduce(
    (sum, p) => sum + (p.current_stock || 0),
    0
  );
  const inventoryValue = products.reduce(
    (sum, p) =>
      sum + (p.current_stock || 0) * Number(p.cost_price_jpy || p.selling_price || 0),
    0
  );

  const alertSummary = {
    critical: alerts.filter((a) => a.alert_level === "critical").length,
    warning: alerts.filter((a) => a.alert_level === "warning").length,
    safe: alerts.filter((a) => a.alert_level === "safe").length,
  };

  const monthlySales: Record<string, { revenue: number; quantity: number }> = {};
  for (const s of salesByMonthRes.data || []) {
    const month = (s.sold_at as string).slice(0, 7);
    if (!monthlySales[month]) {
      monthlySales[month] = { revenue: 0, quantity: 0 };
    }
    monthlySales[month].revenue += Number(s.revenue);
    monthlySales[month].quantity += s.quantity;
  }

  const productCategoryMap: Record<string, string> = {};
  for (const p of products) {
    productCategoryMap[p.id] = (p as Record<string, unknown>).category as string || "その他";
  }

  const categorySales: Record<string, number> = {};
  for (const s of salesByCategoryRes.data || []) {
    const cat = productCategoryMap[s.product_id] || "その他";
    categorySales[cat] = (categorySales[cat] || 0) + Number(s.revenue);
  }

  return NextResponse.json({
    kpi: {
      totalRevenue,
      totalQuantity,
      totalStock,
      inventoryValue,
      productCount: products.length,
      avgOrderValue: totalQuantity > 0 ? Math.round(totalRevenue / totalQuantity) : 0,
    },
    alertSummary,
    monthlySales: Object.entries(monthlySales)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data })),
    categorySales: Object.entries(categorySales)
      .sort(([, a], [, b]) => b - a)
      .map(([category, revenue]) => ({ category, revenue })),
  });
}
