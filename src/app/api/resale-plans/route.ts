import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("resale_plans")
    .select("*, products(name, name_en, sku, category, product_class, current_stock, selling_price), seasons(name, year)")
    .order("planned_month", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const productIds = [...new Set((data || []).map((p) => p.product_id))];
  if (productIds.length > 0) {
    const { data: alerts } = await supabase
      .from("reorder_alerts")
      .select("product_id, monthly_sales_rate, recommended_quantity")
      .in("product_id", productIds);

    const alertMap = new Map((alerts || []).map((a) => [a.product_id, a]));
    for (const plan of data || []) {
      const alert = alertMap.get(plan.product_id);
      plan.monthly_sales_rate = alert?.monthly_sales_rate || 0;
      plan.suggested_quantity = alert?.recommended_quantity || 0;
    }
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();

  const { data, error } = await supabase
    .from("resale_plans")
    .insert({
      product_id: body.product_id,
      planned_season_id: body.planned_season_id || null,
      planned_month: body.planned_month,
      order_deadline: body.order_deadline || null,
      variation_notes: body.variation_notes || null,
      quantity_override: body.quantity_override || null,
      status: body.status || "planned",
      created_by: body.created_by || "user",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "idが必要です" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("resale_plans")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
