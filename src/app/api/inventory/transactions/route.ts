import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const productId = url.searchParams.get("product_id");
  const limit = parseInt(url.searchParams.get("limit") || "100");

  let query = supabase
    .from("inventory_transactions")
    .select("*, products(name, name_en, sku)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (productId) {
    query = query.eq("product_id", productId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
