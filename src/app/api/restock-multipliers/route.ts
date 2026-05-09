import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("restock_multipliers")
    .select("*")
    .order("sell_through_min");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const rows: Array<{
    id: string;
    sell_through_min: number;
    sell_through_max: number;
    multiplier: number;
    notes: string;
  }> = await request.json();

  const results = [];
  for (const row of rows) {
    const { data, error } = await supabase
      .from("restock_multipliers")
      .update({
        sell_through_min: row.sell_through_min,
        sell_through_max: row.sell_through_max,
        multiplier: row.multiplier,
        notes: row.notes,
      })
      .eq("id", row.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    results.push(data);
  }

  return NextResponse.json(results);
}
