import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("classification_thresholds")
    .select("*")
    .order("stage");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, staple_min, archive_max, notes } = body;

  if (!id) {
    return NextResponse.json({ error: "idが必要です" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("classification_thresholds")
    .update({
      staple_min,
      archive_max,
      notes,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
