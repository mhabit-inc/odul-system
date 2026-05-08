import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const months = parseInt(url.searchParams.get("months") || "3");
  const channel = url.searchParams.get("channel") || "";

  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const sinceStr = since.toISOString().slice(0, 10);

  let query = supabase
    .from("ad_costs")
    .select("*")
    .gte("date", sinceStr)
    .order("date", { ascending: false });

  if (channel) {
    query = query.eq("channel", channel);
  }

  const { data: adCosts } = await query;
  const rows = adCosts || [];

  const totalSpend = rows.reduce((s, r) => s + Number(r.spend), 0);
  const totalImpressions = rows.reduce((s, r) => s + (r.impressions || 0), 0);
  const totalClicks = rows.reduce((s, r) => s + (r.clicks || 0), 0);
  const totalConversions = rows.reduce((s, r) => s + (r.conversions || 0), 0);
  const totalConvRevenue = rows.reduce((s, r) => s + Number(r.conversion_revenue || 0), 0);

  const byChannel: Record<string, { spend: number; impressions: number; clicks: number; conversions: number; revenue: number }> = {};
  const byMonth: Record<string, { spend: number; revenue: number }> = {};

  for (const r of rows) {
    const ch = r.channel;
    if (!byChannel[ch]) byChannel[ch] = { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
    byChannel[ch].spend += Number(r.spend);
    byChannel[ch].impressions += r.impressions || 0;
    byChannel[ch].clicks += r.clicks || 0;
    byChannel[ch].conversions += r.conversions || 0;
    byChannel[ch].revenue += Number(r.conversion_revenue || 0);

    const month = (r.date as string).slice(0, 7);
    if (!byMonth[month]) byMonth[month] = { spend: 0, revenue: 0 };
    byMonth[month].spend += Number(r.spend);
    byMonth[month].revenue += Number(r.conversion_revenue || 0);
  }

  return NextResponse.json({
    summary: {
      totalSpend,
      totalImpressions,
      totalClicks,
      totalConversions,
      totalConvRevenue,
      roas: totalSpend > 0 ? totalConvRevenue / totalSpend : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
      cvr: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
    },
    byChannel: Object.entries(byChannel)
      .map(([channel, d]) => ({
        channel,
        ...d,
        roas: d.spend > 0 ? d.revenue / d.spend : 0,
        ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
        cpa: d.conversions > 0 ? d.spend / d.conversions : 0,
      }))
      .sort((a, b) => b.spend - a.spend),
    byMonth: Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({
        month,
        ...d,
        roas: d.spend > 0 ? d.revenue / d.spend : 0,
      })),
    rows,
  });
}
