import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const supplierId = url.searchParams.get("supplier_id");

  let query = supabase
    .from("orders")
    .select("*, products(name, name_en, sku, category), suppliers(name, code)")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }
  if (supplierId) {
    query = query.eq("supplier_id", supplierId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();

  const { data, error } = await supabase
    .from("orders")
    .insert({
      product_id: body.product_id,
      supplier_id: body.supplier_id,
      quantity: body.quantity,
      unit_cost: body.unit_cost || 0,
      total_cost: body.total_cost || 0,
      status: "発注準備",
      ordered_at: body.ordered_at || null,
      expected_delivery: body.expected_delivery || null,
      notes: body.notes || null,
      created_by: body.created_by || null,
    })
    .select("*, products(name, sku), suppliers(name, code)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("order_status_history").insert({
    order_id: data.id,
    to_status: "発注準備",
    changed_by: body.created_by || "system",
    comment: "発注作成",
  });

  return NextResponse.json(data, { status: 201 });
}
