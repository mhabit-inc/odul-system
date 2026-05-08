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

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [months, setMonths] = useState(3);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/dashboard?months=${months}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [months]);

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
