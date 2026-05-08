import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .order("year", { ascending: false })
    .order("start_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { data, error } = await supabase
    .from("seasons")
    .insert({
      name: body.name,
      year: body.year,
      start_date: body.start_date,
      end_date: body.end_date,
      shooting_date: body.shooting_date || null,
      shooting_cost: body.shooting_cost || null,
      uses_previous_creative: body.uses_previous_creative || false,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
