import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { product_id, quantity_change, reason, adjusted_by } = body;

  if (!product_id || quantity_change === undefined) {
    return NextResponse.json(
      { error: "product_id and quantity_change are required" },
      { status: 400 }
    );
  }

  const { data: product } = await supabase
    .from("products")
    .select("current_stock")
    .eq("id", product_id)
    .single();

  if (!product) {
    return NextResponse.json({ error: "product not found" }, { status: 404 });
  }

  const newStock = (product.current_stock || 0) + quantity_change;
  if (newStock < 0) {
    return NextResponse.json(
      { error: "在庫がマイナスになります" },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({ current_stock: newStock })
    .eq("id", product_id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from("inventory_transactions").insert({
    product_id,
    type: quantity_change > 0 ? "adjustment_in" : "adjustment_out",
    quantity: Math.abs(quantity_change),
    reason: reason || "手動調整",
    created_by: adjusted_by || "system",
  });

  return NextResponse.json({
    product_id,
    previous_stock: product.current_stock || 0,
    new_stock: newStock,
    change: quantity_change,
  });
}
