import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const level = searchParams.get("level");
  const productClass = searchParams.get("class");
  const sort = searchParams.get("sort") || "urgency";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  // サマリー取得
  const { data: allAlerts } = await supabase
    .from("reorder_alerts")
    .select("alert_level");

  const summary = {
    critical: allAlerts?.filter((a) => a.alert_level === "critical").length ?? 0,
    warning: allAlerts?.filter((a) => a.alert_level === "warning").length ?? 0,
    safe: allAlerts?.filter((a) => a.alert_level === "safe").length ?? 0,
  };

  // アラート一覧取得（商品情報JOIN）
  let query = supabase
    .from("reorder_alerts")
    .select(
      `*, products!inner(id, sku, name, category, product_class, selling_price, image_url)`,
      { count: "exact" }
    )
    .range(offset, offset + limit - 1);

  if (level) {
    query = query.eq("alert_level", level);
  }

  if (productClass) {
    query = query.eq("products.product_class", productClass);
  }

  if (sort === "urgency") {
    query = query.order("months_until_stockout", { ascending: true });
  } else if (sort === "stock") {
    query = query.order("current_stock", { ascending: true });
  } else {
    query = query.order("calculated_at", { ascending: false });
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    summary,
    alerts: data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      total_pages: Math.ceil((count ?? 0) / limit),
    },
  });
}
