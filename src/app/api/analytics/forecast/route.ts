import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: sales } = await supabase
    .from("sales")
    .select("quantity, revenue, sold_at")
    .gte("sold_at", sixMonthsAgo.toISOString())
    .order("sold_at");

  const monthlyData: Record<string, { revenue: number; quantity: number }> = {};
  for (const s of sales || []) {
    const month = (s.sold_at as string).slice(0, 7);
    if (!monthlyData[month]) monthlyData[month] = { revenue: 0, quantity: 0 };
    monthlyData[month].revenue += Number(s.revenue);
    monthlyData[month].quantity += s.quantity;
  }

  const months = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));

  if (months.length < 2) {
    return NextResponse.json({ historical: months, forecast: [], trend: "insufficient_data" });
  }

  const revenueValues = months.map((m) => m.revenue);
  const n = revenueValues.length;
  const xMean = (n - 1) / 2;
  const yMean = revenueValues.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (revenueValues[i] - yMean);
    den += (i - xMean) * (i - xMean);
  }

  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;

  const forecast = [];
  const lastDate = new Date(months[months.length - 1].month + "-01");
  for (let i = 1; i <= 3; i++) {
    const d = new Date(lastDate);
    d.setMonth(d.getMonth() + i);
    const forecastMonth = d.toISOString().slice(0, 7);
    const forecastRevenue = Math.max(0, Math.round(intercept + slope * (n - 1 + i)));

    const recentMonths = months.slice(-3);
    const avgQuantityPerRevenue = recentMonths.reduce((s, m) => s + m.quantity, 0) /
      Math.max(1, recentMonths.reduce((s, m) => s + m.revenue, 0));
    const forecastQuantity = Math.round(forecastRevenue * avgQuantityPerRevenue);

    forecast.push({
      month: forecastMonth,
      revenue: forecastRevenue,
      quantity: forecastQuantity,
      isForecast: true,
    });
  }

  const growthRate = months.length >= 2
    ? ((months[months.length - 1].revenue - months[0].revenue) / Math.max(1, months[0].revenue)) * 100
    : 0;

  let trend: string;
  if (growthRate > 10) trend = "growing";
  else if (growthRate < -10) trend = "declining";
  else trend = "stable";

  return NextResponse.json({
    historical: months,
    forecast,
    trend,
    growthRate: Math.round(growthRate * 10) / 10,
    slope: Math.round(slope),
  });
}
