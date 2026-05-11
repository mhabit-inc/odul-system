import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const seasonId = url.searchParams.get("season_id");

  if (!seasonId) {
    return NextResponse.json({ error: "season_id is required" }, { status: 400 });
  }

  const { data: plans } = await supabase
    .from("season_plans")
    .select("*, planning_categories(name, avg_unit_price)")
    .eq("season_id", seasonId);

  if (!plans || plans.length === 0) {
    return NextResponse.json({ error: "プランが見つかりません" }, { status: 404 });
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("name, year")
    .eq("id", seasonId)
    .single();

  const headers = [
    "分類", "型数", "発注数", "期待売上", "発売日", "ステータス"
  ];
  const rows = plans.map((p) => [
    p.planning_categories?.name || "",
    p.planned_styles,
    p.planned_quantity,
    p.expected_revenue || 0,
    p.launch_date || "",
    p.status,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const bom = "\uFEFF";
  const filename = `発注計画_${season?.name || ""}_${season?.year || ""}.csv`;

  return new Response(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
