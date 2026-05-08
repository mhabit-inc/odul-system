import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const inspectionId = url.searchParams.get("inspection_id");

  let query = supabase
    .from("defective_items")
    .select("*, inspections(product_id, products(name, sku))")
    .order("id");

  if (inspectionId) {
    query = query.eq("inspection_id", inspectionId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, action, action_status, photo_urls, notes } = body;

  if (!id) {
    return NextResponse.json({ error: "idが必要です" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (action !== undefined) updateData.action = action;
  if (action_status !== undefined) updateData.action_status = action_status;
  if (photo_urls !== undefined) updateData.photo_urls = photo_urls;
  if (notes !== undefined) updateData.notes = notes;

  const { data, error } = await supabase
    .from("defective_items")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
