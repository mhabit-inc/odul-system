import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [orderRes, historyRes, commentsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("*, products(id, name, name_en, sku, category, selling_price), suppliers(name, code)")
      .eq("id", id)
      .single(),
    supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("order_comments")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (orderRes.error) {
    return NextResponse.json({ error: orderRes.error.message }, { status: 404 });
  }

  return NextResponse.json({
    order: orderRes.data,
    history: historyRes.data || [],
    comments: commentsRes.data || [],
  });
}
