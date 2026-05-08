import { supabase } from "@/lib/supabase";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getAlertSummary() {
  const { data } = await supabase
    .from("reorder_alerts")
    .select("alert_level");
  return {
    critical: data?.filter((a) => a.alert_level === "critical").length ?? 0,
    warning: data?.filter((a) => a.alert_level === "warning").length ?? 0,
    safe: data?.filter((a) => a.alert_level === "safe").length ?? 0,
  };
}

async function getCriticalAlerts() {
  const { data } = await supabase
    .from("reorder_alerts")
    .select("*, products!inner(sku, name, category, product_class)")
    .eq("alert_level", "critical")
    .order("months_until_stockout", { ascending: true })
    .limit(5);
  return data ?? [];
}

async function getPendingClassifications() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, count } = await supabase
    .from("products")
    .select("id, sku, name, launched_at", { count: "exact" })
    .eq("product_class", "未分類")
    .not("launched_at", "is", null)
    .lte("launched_at", sevenDaysAgo.toISOString().split("T")[0])
    .limit(5);

  return { items: data ?? [], total: count ?? 0 };
}

async function getProductStats() {
  const { data } = await supabase
    .from("products")
    .select("product_class");

  const classes = data ?? [];
  const count = (cls: string) => classes.filter((p) => p.product_class === cls).length;

  return {
    total: classes.length,
    staple: count("定番"),
    semiStaple: count("セミ定番"),
    newItem: count("新作"),
    archive: count("アーカイブ"),
    novelty: count("ノベルティ"),
    unclassified: count("未分類"),
  };
}

async function getOrderStatus() {
  const { data } = await supabase
    .from("orders")
    .select("status, expected_delivery")
    .in("status", ["発注準備", "発注済", "製造中", "出荷済", "入荷済"]);

  const orders = data ?? [];
  const now = new Date();
  const overdue = orders.filter(
    (o) => o.expected_delivery && new Date(o.expected_delivery) < now && o.status !== "入荷済"
  ).length;

  const byStatus: Record<string, number> = {};
  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
  }

  return { byStatus, total: orders.length, overdue };
}

async function getStockSummary() {
  const { data } = await supabase
    .from("products")
    .select("current_stock, cost_price_jpy, selling_price");

  const products = data ?? [];
  const totalStock = products.reduce((s, p) => s + (p.current_stock || 0), 0);
  const zeroStock = products.filter((p) => (p.current_stock || 0) === 0).length;
  const totalValue = products.reduce(
    (s, p) => s + (p.current_stock || 0) * Number(p.cost_price_jpy || p.selling_price || 0),
    0
  );

  return { totalStock, zeroStock, totalValue };
}

async function getUpcomingEvents() {
  const now = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("events")
    .select("*")
    .gte("end_date", now)
    .order("start_date")
    .limit(3);

  return data ?? [];
}

export default async function Dashboard() {
  const [alertSummary, criticalAlerts, pending, stats, orderStatus, stockSummary, upcomingEvents] = await Promise.all([
    getAlertSummary(),
    getCriticalAlerts(),
    getPendingClassifications(),
    getProductStats(),
    getOrderStatus(),
    getStockSummary(),
    getUpcomingEvents(),
  ]);

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">商品企画DB</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "short",
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
        <StatCard label="定番" value={stats.staple} color="blue" />
        <StatCard label="セミ定番" value={stats.semiStaple} color="purple" />
        <StatCard label="新作" value={stats.newItem} color="orange" />
        <StatCard label="アーカイブ" value={stats.archive} color="gray" />
        <StatCard label="ノベルティ" value={stats.novelty} color="pink" />
        <StatCard label="未分類" value={stats.unclassified} color="gray" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">リオーダーアラート</h2>
          <Link href="/reorder-alerts" className="text-sm text-blue-600 hover:text-blue-800">
            一覧を見る →
          </Link>
        </div>
        <div className="flex gap-4 mb-4">
          <AlertBadge label="要リオーダー" count={alertSummary.critical} color="red" />
          <AlertBadge label="注意" count={alertSummary.warning} color="yellow" />
          <AlertBadge label="余裕あり" count={alertSummary.safe} color="green" />
        </div>
        {criticalAlerts.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 font-medium">商品名</th>
                <th className="pb-2 font-medium">SKU</th>
                <th className="pb-2 font-medium text-right">現在庫</th>
                <th className="pb-2 font-medium text-right">月販</th>
                <th className="pb-2 font-medium text-right">残月数</th>
                <th className="pb-2 font-medium text-right">推奨数</th>
              </tr>
            </thead>
            <tbody>
              {criticalAlerts.map((alert) => (
                <tr key={alert.id} className="border-b border-gray-50">
                  <td className="py-2.5 font-medium text-gray-900">
                    {(alert.products as unknown as { name: string }).name}
                  </td>
                  <td className="py-2.5 text-gray-500">
                    {(alert.products as unknown as { sku: string }).sku}
                  </td>
                  <td className="py-2.5 text-right">{alert.current_stock}</td>
                  <td className="py-2.5 text-right">{alert.monthly_sales_rate}</td>
                  <td className="py-2.5 text-right text-red-600 font-medium">
                    {alert.months_until_stockout}
                  </td>
                  <td className="py-2.5 text-right font-medium">
                    {alert.recommended_quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 text-sm">
            アラートはありません。商品を定番/セミ定番に分類し、売上データを連携すると表示されます。
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">発注状況</h2>
            <Link href="/production" className="text-sm text-blue-600 hover:text-blue-800">
              生産管理 →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{orderStatus.total}</p>
              <p className="text-xs text-gray-500">進行中</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${orderStatus.overdue > 0 ? "text-red-600" : "text-gray-900"}`}>
                {orderStatus.overdue}
              </p>
              <p className="text-xs text-gray-500">納期超過</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {orderStatus.byStatus["入荷済"] || 0}
              </p>
              <p className="text-xs text-gray-500">入荷待ち検品</p>
            </div>
          </div>
          {Object.entries(orderStatus.byStatus).length > 0 ? (
            <div className="flex gap-1">
              {["発注準備", "発注済", "製造中", "出荷済", "入荷済"].map((s) => {
                const count = orderStatus.byStatus[s] || 0;
                if (count === 0) return null;
                const colors: Record<string, string> = {
                  "発注準備": "bg-gray-200", "発注済": "bg-blue-300",
                  "製造中": "bg-yellow-300", "出荷済": "bg-purple-300", "入荷済": "bg-green-300",
                };
                return (
                  <div key={s} className="flex-1" title={`${s}: ${count}件`}>
                    <div className={`h-2 rounded ${colors[s]}`} />
                    <p className="text-[10px] text-gray-500 mt-1 text-center">{s}({count})</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">進行中の発注はありません</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">在庫概況</h2>
            <Link href="/inventory" className="text-sm text-blue-600 hover:text-blue-800">
              在庫管理 →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{stockSummary.totalStock.toLocaleString()}</p>
              <p className="text-xs text-gray-500">総在庫数</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">¥{(stockSummary.totalValue / 10000).toFixed(0)}万</p>
              <p className="text-xs text-gray-500">在庫金額</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${stockSummary.zeroStock > 0 ? "text-red-600" : "text-gray-900"}`}>
                {stockSummary.zeroStock}
              </p>
              <p className="text-xs text-gray-500">在庫切れ</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              分類待ち商品
              {pending.total > 0 && (
                <span className="ml-2 text-sm font-normal text-orange-600">{pending.total}件</span>
              )}
            </h2>
            <Link href="/classifications" className="text-sm text-blue-600 hover:text-blue-800">
              分類管理 →
            </Link>
          </div>
          {pending.items.length > 0 ? (
            <div className="space-y-2">
              {pending.items.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{p.name}</span>
                    <span className="ml-2 text-xs text-gray-500">{p.sku}</span>
                  </div>
                  <span className="text-xs text-gray-500">発売: {p.launched_at}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">分類待ちの商品はありません。</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">直近のイベント</h2>
            <Link href="/events" className="text-sm text-blue-600 hover:text-blue-800">
              イベント管理 →
            </Link>
          </div>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.map((e) => {
                const now = new Date();
                const start = new Date(e.start_date);
                const end = new Date(e.end_date);
                const isActive = now >= start && now <= end;
                return (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      {isActive && <span className="w-2 h-2 rounded-full bg-green-500" />}
                      <span className="text-sm font-medium text-gray-900">{e.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {e.start_date} 〜 {e.end_date}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">予定されたイベントはありません。</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "gray" }: { label: string; value: number; color?: string }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600",
    purple: "text-purple-600",
    orange: "text-orange-600",
    pink: "text-pink-600",
    gray: "text-gray-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${colorMap[color] || "text-gray-900"}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function AlertBadge({ label, count, color }: { label: string; count: number; color: string }) {
  const colorMap: Record<string, string> = {
    red: "bg-red-50 text-red-700 border-red-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    green: "bg-green-50 text-green-700 border-green-200",
  };
  return (
    <div className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${colorMap[color]}`}>
      {label} ({count})
    </div>
  );
}
