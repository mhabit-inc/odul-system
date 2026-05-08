import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import {
  generateProposalPdf,
  type ProposalData,
} from "@/lib/generate-proposal-pdf";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const seasonId = url.searchParams.get("season_id");

  if (!seasonId) {
    return NextResponse.json(
      { error: "season_id required" },
      { status: 400 }
    );
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("id", seasonId)
    .single();

  if (!season) {
    return NextResponse.json({ error: "season not found" }, { status: 404 });
  }

  const { data: plans } = await supabase
    .from("new_product_plans")
    .select("*, planning_categories(*)")
    .eq("season_id", seasonId)
    .order("created_at");

  if (!plans || plans.length === 0) {
    return NextResponse.json(
      { error: "no plans found for this season" },
      { status: 404 }
    );
  }

  const proposalData: ProposalData = {
    seasonName: season.name,
    seasonYear: season.year,
    seasonPeriod: `${season.start_date} ~ ${season.end_date}`,
    shootingDate: season.shooting_date,
    shootingCost: season.shooting_cost ? Number(season.shooting_cost) : null,
    plans: plans.map((p) => ({
      categoryName: p.planning_categories.name,
      ownerRole: p.planning_categories.owner_role,
      styles: p.planned_styles,
      quantity: p.planned_quantity,
      expectedRevenue: Number(p.expected_revenue || 0),
      launchDate: p.launch_date,
      sellThrough: p.planning_categories.expected_sell_through_90d
        ? Number(p.planning_categories.expected_sell_through_90d)
        : null,
      avgUnitPrice: p.planning_categories.avg_unit_price
        ? Number(p.planning_categories.avg_unit_price)
        : null,
    })),
    totalStyles: plans.reduce((sum, p) => sum + p.planned_styles, 0),
    totalQuantity: plans.reduce((sum, p) => sum + p.planned_quantity, 0),
    totalRevenue: plans.reduce(
      (sum, p) => sum + Number(p.expected_revenue || 0),
      0
    ),
    createdAt: new Date().toISOString().slice(0, 10),
  };

  const buffer = await generateProposalPdf(proposalData);
  const filename = `proposal_${season.name}_${season.year}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
