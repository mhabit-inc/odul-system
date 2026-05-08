"use client";

import { useState, useEffect } from "react";

type DashboardData = {
  kpi: {
    totalRevenue: number;
    totalQuantity: number;
    totalStock: number;
    inventoryValue: number;
    productCount: number;
    avgOrderValue: number;
  };
  alertSummary: {
    critical: number;
    warning: number;
    safe: number;
  };
  monthlySales: Array<{
    month: string;
    revenue: number;
    quantity: number;
  }>;
  categorySales: Array<{
    category: string;
    revenue: number;
  }>;
};

type RankingItem = {
  productId: string;
  name: string;
  sku: string;
  category: string;
  productClass: string;
  revenue: number;
  quantity: number;
  grossProfit: number;
  grossMargin: number;
  currentStock: number;
  avgPrice: number;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [months, setMonths] = useState(3);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "ranking">("overview");
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [rankSort, setRankSort] = useState("revenue");
  const [rankLoading, setRankLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/dashboard?months=${months}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [months]);

  useEffect(() => {
    if (tab === "ranking") {
      setRankLoading(true);
      fetch(`/api/analytics/ranking?months=${months}&sort=${rankSort}`)
        .then((r) => r.json())
        .then((d) => {
          setRanking(Array.isArray(d) ? d : []);
          setRankLoading(false);
        });
    }
  }, [tab, months, rankSort]);

  if (loading || !data) {
    return (
      <div className="max-w-6xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">分析ダッシュボード</h1>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const totalCategorySales = data.categorySales.reduce(
    (sum, c) => sum + c.revenue,
    0
  );

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">分析ダッシュボード</h1>
          <p className="text-sm text-gray-500">売上・在庫・アラートの統合分析</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setTab("overview")}
              className={`px-3 py-1.5 text-sm ${tab === "overview" ? "bg-gray-900 text-white" : "bg-white text-gray-600"}`}
            >
              概要
            </button>
            <button
              onClick={() => setTab("ranking")}
              className={`px-3 py-1.5 text-sm ${tab === "ranking" ? "bg-gray-900 text-white" : "bg-white text-gray-600"}`}
            >
              ランキング
            </button>
          </div>
          <div className="flex items-center gap-2">
          {[1, 3, 6, 12].map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                months === m
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {m}ヶ月
            </button>
          ))}
          </div>
        </div>
      </div>

      {tab === "ranking" ? (
        <div>
          <div className="flex gap-2 mb-4">
            {[
              { value: "revenue", label: "売上順" },
              { value: "quantity", label: "販売数順" },
              { value: "profit", label: "粗利順" },
            ].map((s) => (
              <button
                key={s.value}
                onClick={() => setRankSort(s.value)}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  rankSort === s.value
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-200 text-gray-600"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {rankLoading ? (
            <p className="text-gray-500">読み込み中...</p>
          ) : ranking.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b bg-gray-50">
                    <th className="px-4 py-3 font-medium w-8">#</th>
                    <th className="px-4 py-3 font-medium">商品名</th>
                    <th className="px-4 py-3 font-medium">SKU</th>
                    <th className="px-4 py-3 font-medium">分類</th>
                    <th className="px-4 py-3 font-medium text-right">売上</th>
                    <th className="px-4 py-3 font-medium text-right">販売数</th>
                    <th className="px-4 py-3 font-medium text-right">粗利</th>
                    <th className="px-4 py-3 font-medium text-right">粗利率</th>
                    <th className="px-4 py-3 font-medium text-right">在庫</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r, i) => (
                    <tr key={r.productId} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400 font-medium">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.sku}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          r.productClass === "定番" ? "bg-blue-50 text-blue-700" :
                          r.productClass === "セミ定番" ? "bg-purple-50 text-purple-700" :
                          r.productClass === "新作" ? "bg-orange-50 text-orange-700" :
                          "bg-gray-100 text-gray-500"
                        }`}>{r.productClass}</span>
                      </td>
                      <td className="px-4 py-3 text-right">¥{r.revenue.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{r.quantity}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={r.grossProfit < 0 ? "text-red-600" : "text-gray-900"}>
                          ¥{r.grossProfit.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={r.grossMargin < 30 ? "text-red-600" : r.grossMargin > 60 ? "text-green-600" : "text-gray-600"}>
                          {r.grossMargin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={r.currentStock === 0 ? "text-red-600" : "text-gray-600"}>
                          {r.currentStock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-500">売上データがありません</p>
            </div>
          )}
        </div>
      ) : (
        <>
      <div className="grid grid-cols-6 gap-3 mb-6">
        <KpiCard
          label="売上"
          value={`¥${data.kpi.totalRevenue.toLocaleString()}`}
        />
        <KpiCard label="販売数" value={`${data.kpi.totalQuantity.toLocaleString()}個`} />
        <KpiCard
          label="平均単価"
          value={`¥${data.kpi.avgOrderValue.toLocaleString()}`}
        />
        <KpiCard label="在庫数" value={`${data.kpi.totalStock.toLocaleString()}個`} />
        <KpiCard
          label="在庫金額"
          value={`¥${data.kpi.inventoryValue.toLocaleString()}`}
        />
        <KpiCard label="SKU数" value={`${data.kpi.productCount}`} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-red-600">
            {data.alertSummary.critical}
          </p>
          <p className="text-xs text-red-500">要リオーダー</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-600">
            {data.alertSummary.warning}
          </p>
          <p className="text-xs text-yellow-500">注意</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-600">
            {data.alertSummary.safe}
          </p>
          <p className="text-xs text-green-500">余裕あり</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            月次売上推移
          </h3>
          {data.monthlySales.length > 0 ? (
            <div className="space-y-2">
              {data.monthlySales.map((m) => {
                const maxRevenue = Math.max(
                  ...data.monthlySales.map((s) => s.revenue)
                );
                const pct =
                  maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16">
                      {m.month}
                    </span>
                    <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-24 text-right">
                      ¥{m.revenue.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">データなし</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            カテゴリ別売上構成
          </h3>
          {data.categorySales.length > 0 ? (
            <div className="space-y-2">
              {data.categorySales.map((c) => {
                const pct =
                  totalCategorySales > 0
                    ? ((c.revenue / totalCategorySales) * 100).toFixed(1)
                    : "0";
                return (
                  <div key={c.category} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-24">
                      {c.category}
                    </span>
                    <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded"
                        style={{
                          width: `${(c.revenue / totalCategorySales) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">データなし</p>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
