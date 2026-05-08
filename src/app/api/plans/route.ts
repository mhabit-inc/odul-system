import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const seasonId = url.searchParams.get("season_id");

  let query = supabase
    .from("new_product_plans")
    .select("*, seasons(*), planning_categories(*)")
    .order("created_at", { ascending: false });

  if (seasonId) {
    query = query.eq("season_id", seasonId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const seasonId = url.searchParams.get("season_id");
  if (!seasonId) {
    return NextResponse.json({ error: "season_id required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("new_product_plans")
    .delete()
    .eq("season_id", seasonId)
    .eq("status", "draft");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const body = await request.json();

  const plans = body.plans as Array<{
    season_id: string;
    planning_category_id: string;
    planned_styles: number;
    planned_quantity: number;
    expected_revenue: number;
    launch_date: string | null;
  }>;

  const { data, error } = await supabase
    .from("new_product_plans")
    .insert(
      plans.map((p) => ({
        season_id: p.season_id,
        planning_category_id: p.planning_category_id,
        planned_styles: p.planned_styles,
        planned_quantity: p.planned_quantity,
        expected_revenue: p.expected_revenue,
        launch_date: p.launch_date || null,
        status: "draft",
      }))
    )
    .select("*, seasons(*), planning_categories(*)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
