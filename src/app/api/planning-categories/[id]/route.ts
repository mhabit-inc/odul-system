import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const { data, error } = await supabase
    .from("planning_categories")
    .update({
      max_styles: body.max_styles,
      avg_order_per_size: body.avg_order_per_size,
      max_order_quantity: body.max_order_quantity,
      avg_unit_price: body.avg_unit_price,
      expected_sell_through_90d: body.expected_sell_through_90d,
      max_stones: body.max_stones,
      launch_timing_note: body.launch_timing_note,
      product_type_example: body.product_type_example,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
