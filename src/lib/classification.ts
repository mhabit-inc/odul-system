import { createAdminClient } from "./supabase";

type ClassificationResult = {
  checked: number;
  suggestions: {
    product_id: string;
    sku: string;
    name: string;
    stage: string;
    suggestion: string;
    value: number;
  }[];
};

export async function checkClassifications(): Promise<ClassificationResult> {
  const supabase = createAdminClient();
  const now = new Date();
  const result: ClassificationResult = { checked: 0, suggestions: [] };

  // 閾値を取得
  const { data: thresholds } = await supabase
    .from("classification_thresholds")
    .select("*")
    .order("effective_from", { ascending: false });

  const prelimThreshold = thresholds?.find((t) => t.stage === "preliminary");
  const confirmedThreshold = thresholds?.find((t) => t.stage === "confirmed");

  if (!prelimThreshold || !confirmedThreshold) return result;

  // 7日一次判定: 発売後7日経過 & 未分類の商品
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: prelimProducts } = await supabase
    .from("products")
    .select("id, sku, name, launched_at")
    .eq("product_class", "未分類")
    .not("launched_at", "is", null)
    .lte("launched_at", sevenDaysAgo.toISOString().split("T")[0]);

  if (prelimProducts) {
    for (const product of prelimProducts) {
      const launchedAt = new Date(product.launched_at);
      const weekAfter = new Date(launchedAt);
      weekAfter.setDate(weekAfter.getDate() + 7);

      const { data: salesData } = await supabase
        .from("sales")
        .select("quantity")
        .eq("product_id", product.id)
        .gte("sold_at", launchedAt.toISOString())
        .lte("sold_at", weekAfter.toISOString());

      const firstWeekSales = salesData?.reduce((sum, s) => sum + s.quantity, 0) ?? 0;

      let suggestion: string;
      if (firstWeekSales >= prelimThreshold.staple_min) {
        suggestion = "定番候補";
      } else if (firstWeekSales <= prelimThreshold.archive_max) {
        suggestion = "アーカイブ候補";
      } else {
        suggestion = "セミ定番候補";
      }

      result.suggestions.push({
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        stage: "preliminary",
        suggestion,
        value: firstWeekSales,
      });

      result.checked++;
    }
  }

  // 90日確定判定: 仮分類後90日経過
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: confirmProducts } = await supabase
    .from("products")
    .select("id, sku, name, launched_at, product_class_stage")
    .eq("product_class_stage", "preliminary")
    .not("launched_at", "is", null)
    .lte("launched_at", ninetyDaysAgo.toISOString().split("T")[0]);

  if (confirmProducts) {
    for (const product of confirmProducts) {
      // 90日間の売上合計
      const launchedAt = new Date(product.launched_at);
      const ninetyAfter = new Date(launchedAt);
      ninetyAfter.setDate(ninetyAfter.getDate() + 90);

      const { data: salesData } = await supabase
        .from("sales")
        .select("quantity")
        .eq("product_id", product.id)
        .gte("sold_at", launchedAt.toISOString())
        .lte("sold_at", ninetyAfter.toISOString());

      const totalSold = salesData?.reduce((sum, s) => sum + s.quantity, 0) ?? 0;

      // 初回発注数を取得（簡易: 同SKUのplan_itemsから）
      const { data: planItems } = await supabase
        .from("new_product_plan_items")
        .select("quantity")
        .eq("product_id", product.id)
        .limit(1);

      const initialOrder = planItems?.[0]?.quantity || totalSold || 1;
      const sellThroughRate = (totalSold / initialOrder) * 100;

      let suggestion: string;
      if (sellThroughRate >= confirmedThreshold.staple_min) {
        suggestion = "定番";
      } else if (sellThroughRate < confirmedThreshold.archive_max) {
        suggestion = "アーカイブ";
      } else {
        suggestion = "セミ定番";
      }

      result.suggestions.push({
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        stage: "confirmed",
        suggestion,
        value: Math.round(sellThroughRate * 10) / 10,
      });

      result.checked++;
    }
  }

  return result;
}

export async function applyClassification(
  productId: string,
  classType: string,
  stage: string,
  reason: string,
  classifiedBy: string
) {
  const supabase = createAdminClient();

  // 商品の分類を更新
  const productClass =
    classType === "定番候補"
      ? "定番"
      : classType === "セミ定番候補"
        ? "セミ定番"
        : classType === "アーカイブ候補"
          ? "アーカイブ"
          : classType;

  const { error: updateError } = await supabase
    .from("products")
    .update({
      product_class: productClass,
      product_class_stage: stage,
    })
    .eq("id", productId);

  if (updateError) throw new Error(updateError.message);

  // 分類履歴を記録
  const { error: historyError } = await supabase
    .from("product_classifications")
    .insert({
      product_id: productId,
      class_type: classType,
      stage,
      reason,
      classified_by: classifiedBy,
    });

  if (historyError) throw new Error(historyError.message);

  return { success: true };
}
