import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [productRes, salesRes, ordersRes, inspectionsRes, classHistoryRes] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", id).single(),
      supabase
        .from("sales")
        .select("*")
        .eq("product_id", id)
        .order("sold_at", { ascending: false })
        .limit(100),
      supabase
        .from("orders")
        .select("*, suppliers(name, code)")
        .eq("product_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("inspections")
        .select("*, defective_items(*)")
        .eq("product_id", id)
        .order("inspected_at", { ascending: false }),
      supabase
        .from("classification_history")
        .select("*")
        .eq("product_id", id)
        .order("changed_at", { ascending: false }),
    ]);

  if (productRes.error) {
    return NextResponse.json(
      { error: productRes.error.message },
      { status: 404 }
    );
  }

  const sales = salesRes.data || [];
  const totalSalesRevenue = sales.reduce(
    (sum, s) => sum + Number(s.revenue || 0),
    0
  );
  const totalSalesQuantity = sales.reduce(
    (sum, s) => sum + (s.quantity || 0),
    0
  );

  const monthlySales: Record<string, { revenue: number; quantity: number }> =
    {};
  for (const s of sales) {
    const month = (s.sold_at as string).slice(0, 7);
    if (!monthlySales[month]) monthlySales[month] = { revenue: 0, quantity: 0 };
    monthlySales[month].revenue += Number(s.revenue || 0);
    monthlySales[month].quantity += s.quantity || 0;
  }

  return NextResponse.json({
    product: productRes.data,
    sales: {
      totalRevenue: totalSalesRevenue,
      totalQuantity: totalSalesQuantity,
      monthlySales: Object.entries(monthlySales)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, data]) => ({ month, ...data })),
      recent: sales.slice(0, 20),
    },
    orders: ordersRes.data || [],
    inspections: inspectionsRes.data || [],
    classificationHistory: classHistoryRes.data || [],
  });
}
