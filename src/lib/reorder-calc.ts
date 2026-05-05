import { createAdminClient } from "./supabase";

const LEAD_TIME_MONTHS = 3.5;
const BUFFER_MONTHS = 1.5;
const TARGET_MONTHS = LEAD_TIME_MONTHS + BUFFER_MONTHS; // 5ヶ月分

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

  // 定番・セミ定番商品を取得
  const { data: products, error: prodError } = await supabase
    .from("products")
    .select("id, sku, name, product_class, current_stock, launched_at, selling_price")
    .in("product_class", ["定番", "セミ定番"]);

  if (prodError) {
    result.errors.push(`Products fetch: ${prodError.message}`);
    return result;
  }

  if (!products || products.length === 0) {
    return result;
  }

  // 現在のイベント係数を取得
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

  // 既存アラートを削除して再計算
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

  for (const product of products) {
    // 過去12週の売上データを取得
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    const { data: salesData } = await supabase
      .from("sales")
      .select("quantity, sold_at")
      .eq("product_id", product.id)
      .gte("sold_at", twelveWeeksAgo.toISOString());

    const totalSold = salesData?.reduce((sum, s) => sum + s.quantity, 0) ?? 0;

    if (totalSold === 0) {
      result.skipped++;
      continue;
    }

    // 売上期間（週数）を計算
    const oldestSale = salesData?.reduce((oldest, s) => {
      return s.sold_at < oldest ? s.sold_at : oldest;
    }, new Date().toISOString());

    const weeksOfData = Math.max(
      1,
      (Date.now() - new Date(oldestSale!).getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    // 月間販売ペース（イベント係数加味）
    const weeklyRate = totalSold / weeksOfData;
    const monthlyRate = weeklyRate * 4.33 * eventCoefficient;

    // 在庫切れまでの月数
    const currentStock = product.current_stock || 0;
    const monthsUntilStockout = monthlyRate > 0 ? currentStock / monthlyRate : 999;

    // アラートレベル判定
    let alertLevel: string;
    if (monthsUntilStockout <= LEAD_TIME_MONTHS) {
      alertLevel = "critical";
      result.critical++;
    } else if (monthsUntilStockout <= TARGET_MONTHS) {
      alertLevel = "warning";
      result.warning++;
    } else {
      alertLevel = "safe";
      result.safe++;
    }

    // 推奨発注数（定番: 安全在庫5 + 5ヶ月分 − 現在庫）
    const safetyStock = 5;
    const targetStock = safetyStock + monthlyRate * TARGET_MONTHS;
    const recommended = Math.max(0, Math.ceil(targetStock - currentStock));

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

  // バッチインサート
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
