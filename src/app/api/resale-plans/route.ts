import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("resale_plans")
    .select("*, products(name, name_en, sku, category, product_class, current_stock), seasons(name, year)")
    .order("planned_month", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
