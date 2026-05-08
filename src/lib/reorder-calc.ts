import { createAdminClient } from "./supabase";

const DEFAULT_LEAD_TIME_MONTHS = 3.5;
const BUFFER_MONTHS = 1.5;

type CalcResult = {
  calculated: number;
  critical: number;
  warning: number;
  safe: number;
  skipped: number;
  errors: string[];
};

export async function calculateReorderAlerts(): Promise<CalcResult> {
  const supabase = createAdminClient();

  const result: CalcResult = {
    calculated: 0,
    critical: 0,
    warning: 0,
    safe: 0,
    skipped: 0,
    errors: [],
  };

  const { data: products, error: prodError } = await supabase
    .from("products")
    .select("id, sku, name, product_class, current_stock, launched_at, selling_price, supplier_id")
    .in("product_class", ["定番", "セミ定番"]);

  if (prodError) {
    result.errors.push(`Products fetch: ${prodError.message}`);
    return result;
  }

  if (!products || products.length === 0) return result;

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, lead_time_days");

  const supplierLT = new Map(
    (suppliers || []).map((s) => [s.id, s.lead_time_days / 30])
  );

  const { data: multipliers } = await supabase
    .from("restock_multipliers")
    .select("*")
    .order("sell_through_min");

  const now = new Date().toISOString().split("T")[0];
  const { data: activeEvents } = await supabase
    .from("events")
    .select("sales_coefficient")
    .lte("start_date", now)
    .gte("end_date", now);

  const eventCoefficient = activeEvents?.reduce(
    (max, e) => Math.max(max, e.sales_coefficient),
    1.0
  ) ?? 1.0;

  const { data: pendingOrders } = await supabase
    .from("orders")
    .select("product_id, quantity, status")
    .not("status", "eq", "完了");

  const incomingStock: Record<string, number> = {};
  for (const o of pendingOrders || []) {
    incomingStock[o.product_id] = (incomingStock[o.product_id] || 0) + o.quantity;
  }

  await supabase.from("reorder_alerts").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const alerts: {
    product_id: string;
    alert_level: string;
    current_stock: number;
    monthly_sales_rate: number;
    months_until_stockout: number;
    recommended_quantity: number;
    event_coefficient: number;
  }[] = [];

  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

  const { data: allSales } = await supabase
    .from("sales")
    .select("product_id, quantity, sold_at")
    .gte("sold_at", twelveWeeksAgo.toISOString());

  const salesByProduct: Record<string, Array<{ quantity: number; sold_at: string }>> = {};
  for (const s of allSales || []) {
    if (!salesByProduct[s.product_id]) salesByProduct[s.product_id] = [];
    salesByProduct[s.product_id].push(s);
  }

  for (const product of products) {
    const salesData = salesByProduct[product.id] || [];
    const totalSold = salesData.reduce((sum, s) => sum + s.quantity, 0);

    if (totalSold === 0) {
      result.skipped++;
      continue;
    }

    const leadTimeMonths = product.supplier_id && supplierLT.has(product.supplier_id)
      ? supplierLT.get(product.supplier_id)!
      : DEFAULT_LEAD_TIME_MONTHS;

    const targetMonths = leadTimeMonths + BUFFER_MONTHS;

    const weekBuckets: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (const s of salesData) {
      const weeksAgo = Math.floor(
        (Date.now() - new Date(s.sold_at).getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      const idx = Math.min(11, Math.max(0, weeksAgo));
      weekBuckets[idx] += s.quantity;
    }

    const recentWeeks = weekBuckets.slice(0, 4);
    const olderWeeks = weekBuckets.slice(4, 12);
    const recentAvg = recentWeeks.reduce((a, b) => a + b, 0) / Math.max(1, recentWeeks.filter((w) => w > 0).length || 1);
    const olderAvg = olderWeeks.reduce((a, b) => a + b, 0) / Math.max(1, olderWeeks.filter((w) => w > 0).length || 1);

    const weightedWeekly = recentAvg * 0.7 + olderAvg * 0.3;
    const monthlyRate = weightedWeekly * 4.33 * eventCoefficient;

    const currentStock = product.current_stock || 0;
    const incoming = incomingStock[product.id] || 0;
    const effectiveStock = currentStock + incoming;
    const monthsUntilStockout = monthlyRate > 0 ? effectiveStock / monthlyRate : 999;

    let alertLevel: string;
    if (monthsUntilStockout <= leadTimeMonths) {
      alertLevel = "critical";
      result.critical++;
    } else if (monthsUntilStockout <= targetMonths) {
      alertLevel = "warning";
      result.warning++;
    } else {
      alertLevel = "safe";
      result.safe++;
    }

    let restockMultiplier = 1.0;
    if (product.product_class === "セミ定番" && multipliers && multipliers.length > 0) {
      const launchedAt = product.launched_at ? new Date(product.launched_at) : null;
      if (launchedAt) {
        const daysSinceLaunch = (Date.now() - launchedAt.getTime()) / (24 * 60 * 60 * 1000);
        const ninetyDaySales = salesData
          .filter((s) => {
            const d = new Date(s.sold_at);
            return d >= launchedAt && d <= new Date(launchedAt.getTime() + 90 * 24 * 60 * 60 * 1000);
          })
          .reduce((sum, s) => sum + s.quantity, 0);

        if (daysSinceLaunch >= 90 && totalSold > 0) {
          const sellThrough = (ninetyDaySales / Math.max(1, currentStock + totalSold)) * 100;
          const match = multipliers.find(
            (m) => sellThrough >= Number(m.sell_through_min) && sellThrough < Number(m.sell_through_max)
          );
          if (match) restockMultiplier = Number(match.multiplier);
        }
      }
    }

    const safetyStock = Math.max(5, Math.ceil(monthlyRate * 0.5));
    const targetStock = safetyStock + monthlyRate * targetMonths;
    const rawRecommended = Math.max(0, Math.ceil((targetStock - effectiveStock) * restockMultiplier));
    const recommended = Math.ceil(rawRecommended / 5) * 5;

    alerts.push({
      product_id: product.id,
      alert_level: alertLevel,
      current_stock: currentStock,
      monthly_sales_rate: Math.round(monthlyRate * 100) / 100,
      months_until_stockout: Math.round(monthsUntilStockout * 10) / 10,
      recommended_quantity: recommended,
      event_coefficient: eventCoefficient,
    });

    result.calculated++;
  }

  if (alerts.length > 0) {
    const BATCH_SIZE = 100;
    for (let i = 0; i < alerts.length; i += BATCH_SIZE) {
      const batch = alerts.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("reorder_alerts").insert(batch);
      if (error) {
        result.errors.push(`Alert batch ${i / BATCH_SIZE}: ${error.message}`);
      }
    }
  }

  return result;
}
