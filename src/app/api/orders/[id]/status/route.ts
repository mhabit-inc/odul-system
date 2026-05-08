import { supabase } from "@/lib/supabase";
import { orderStatusNotification } from "@/lib/slack";
import { NextResponse } from "next/server";

const STATUS_FLOW = [
  "発注準備",
  "発注済",
  "製造中",
  "出荷済",
  "入荷済",
  "検品済",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const newStatus = body.status as string;

  if (!STATUS_FLOW.includes(newStatus)) {
    return NextResponse.json(
      { error: `invalid status: ${newStatus}` },
      { status: 400 }
    );
  }

  const { data: order } = await supabase
    .from("orders")
    .select("status, actual_delivery")
    .eq("id", id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === "入荷済" || newStatus === "検品済") {
    if (!(order as Record<string, unknown>).actual_delivery) {
      updateData.actual_delivery = new Date().toISOString().slice(0, 10);
    }
  }

  const { data, error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("order_status_history").insert({
    order_id: id,
    from_status: order.status,
    to_status: newStatus,
    changed_by: body.changed_by || "system",
    comment: body.comment || null,
  });

  const { data: orderDetail } = await supabase
    .from("orders")
    .select("products(name, name_en, sku)")
    .eq("id", id)
    .single();

  const prod = (orderDetail as Record<string, unknown>)?.products as Record<string, string> | null;
  if (prod) {
    orderStatusNotification(
      prod.name || prod.name_en || "不明",
      prod.sku || "",
      order.status,
      newStatus,
      body.changed_by || "system"
    ).catch(() => {});
  }

  return NextResponse.json(data);
}
