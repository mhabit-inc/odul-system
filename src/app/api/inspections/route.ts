import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("inspections")
    .select("*, products(name, sku), orders(quantity, status)")
    .order("inspected_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();

  const { data: inspection, error } = await supabase
    .from("inspections")
    .insert({
      order_id: body.order_id,
      product_id: body.product_id,
      inspected_quantity: body.inspected_quantity,
      good_quantity: body.good_quantity,
      defective_quantity: body.defective_quantity,
      missing_quantity: body.missing_quantity,
      notes: body.notes || null,
      inspected_by: body.inspected_by || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.defective_details && body.defective_details.length > 0) {
    await supabase.from("defective_items").insert(
      body.defective_details.map(
        (d: { reason: string; quantity: number; notes?: string }) => ({
          inspection_id: inspection.id,
          reason: d.reason,
          quantity: d.quantity,
          notes: d.notes || null,
        })
      )
    );
  }

  if (body.good_quantity > 0) {
    await supabase.from("inventory_transactions").insert({
      product_id: body.product_id,
      type: "入荷",
      quantity: body.good_quantity,
      reference_id: inspection.id,
      notes: `検品完了: 良品${body.good_quantity}個`,
      created_by: body.inspected_by || "system",
    });
  }

  await supabase
    .from("orders")
    .update({ status: "検品済" })
    .eq("id", body.order_id);

  await supabase.from("order_status_history").insert({
    order_id: body.order_id,
    from_status: "入荷済",
    to_status: "検品済",
    changed_by: body.inspected_by || "system",
    comment: `検品完了 良品:${body.good_quantity} 不良:${body.defective_quantity} 未着:${body.missing_quantity}`,
  });

  return NextResponse.json(inspection, { status: 201 });
}
