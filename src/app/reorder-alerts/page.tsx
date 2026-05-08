import { supabase } from "@/lib/supabase";
import Link from "next/link";

export const dynamic = "force-dynamic";

type AlertLevel = "critical" | "warning" | "safe";

async function getAlerts(level?: string) {
  const { data: allAlerts } = await supabase
    .from("reorder_alerts")
    .select("alert_level");

  const summary = {
    critical: allAlerts?.filter((a) => a.alert_level === "critical").length ?? 0,
    warning: allAlerts?.filter((a) => a.alert_level === "warning").length ?? 0,
    safe: allAlerts?.filter((a) => a.alert_level === "safe").length ?? 0,
  };

  let query = supabase
    .from("reorder_alerts")
    .select(
      "*, products!inner(id, sku, name, category, product_class, selling_price)"
    )
    .order("months_until_stockout", { ascending: true });

  if (level && level !== "all") {
    query = query.eq("alert_level", level);
  }

  const { data } = await query;
  return { summary, alerts: data ?? [] };
}

export default async function ReorderAlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const params = await searchParams;
  const level = params.level || "all";
  const { summary, alerts } = await getAlerts(level);

  const levelConfig: Record<AlertLevel, { label: string; bg: string; text: string; border: string }> = {
    critical: { label: "要リオーダー", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    warning: { label: "注意", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
    safe: { label: "余裕あり", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">リオーダーアラート</h1>
      </div>

      <div className="flex gap-3 mb-6">
        <FilterTab href="/reorder-alerts" label="すべて" count={summary.critical + summary.warning + summary.safe} active={level === "all"} />
        <FilterTab href="/reorder-alerts?level=critical" label="要リオーダー" count={summary.critical} active={level === "critical"} color="red" />
        <FilterTab href="/reorder-alerts?level=warning" label="注意" count={summary.warning} active={level === "warning"} color="yellow" />
        <FilterTab href="/reorder-alerts?level=safe" label="余裕あり" count={summary.safe} active={level === "safe"} color="green" />
      </div>

      {alerts.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">ステータス</th>
                <th className="px-4 py-3 font-medium">商品名</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">分類</th>
                <th className="px-4 py-3 font-medium text-right">現在庫</th>
                <th className="px-4 py-3 font-medium text-right">月販数</th>
                <th className="px-4 py-3 font-medium text-right">残月数</th>
                <th className="px-4 py-3 font-medium text-right">推奨発注数</th>
                <th className="px-4 py-3 font-medium text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => {
                const product = alert.products as unknown as {
                  id: string;
                  sku: string;
                  name: string;
                  category: string;
                  product_class: string;
                };
                const config = levelConfig[alert.alert_level as AlertLevel];
                return (
                  <tr key={alert.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text} ${config.border} border`}>
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{product.sku}</td>
                    <td className="px-4 py-3 text-gray-500">{product.product_class}</td>
                    <td className="px-4 py-3 text-right">{alert.current_stock}</td>
                    <td className="px-4 py-3 text-right">{alert.monthly_sales_rate}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={alert.alert_level === "critical" ? "text-red-600 font-medium" : ""}>
                        {alert.months_until_stockout}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{alert.recommended_quantity}</td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/production/new?product_id=${product.id}`}
                        className="px-2 py-1 bg-gray-900 text-white rounded text-xs hover:bg-gray-800"
                      >
                        発注する
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            アラートはありません。商品を定番/セミ定番に分類し、売上データを連携すると表示されます。
          </p>
        </div>
      )}
    </div>
  );
}

function FilterTab({
  href,
  label,
  count,
  active,
  color,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    red: "text-red-600",
    yellow: "text-yellow-600",
    green: "text-green-600",
  };
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-gray-900 text-white"
          : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}{" "}
      <span className={active ? "text-gray-300" : colorMap[color || ""] || "text-gray-400"}>
        {count}
      </span>
    </Link>
  );
}
