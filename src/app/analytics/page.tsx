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

type AdSummary = {
  summary: {
    totalSpend: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalConvRevenue: number;
    roas: number;
    ctr: number;
    cpa: number;
    cvr: number;
  };
  byChannel: Array<{
    channel: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    roas: number;
    ctr: number;
    cpa: number;
  }>;
  byMonth: Array<{
    month: string;
    spend: number;
    revenue: number;
    roas: number;
  }>;
};

type PLData = {
  summary: {
    totalRevenue: number;
    totalCogs: number;
    totalGrossProfit: number;
    totalAdSpend: number;
    totalOperatingProfit: number;
    unallocatedAdSpend: number;
  };
  products: Array<{
    productId: string;
    name: string;
    sku: string;
    category: string;
    productClass: string;
    revenue: number;
    quantity: number;
    cogs: number;
    grossProfit: number;
    grossMargin: number;
    adSpend: number;
    operatingProfit: number;
    operatingMargin: number;
    currentStock: number;
    inventoryValue: number;
  }>;
};

type TurnoverData = {
  summary: {
    avgTurnover: number;
    totalInventoryValue: number;
    totalCogs: number;
    productCount: number;
  };
  products: Array<{
    productId: string;
    name: string;
    sku: string;
    category: string;
    productClass: string;
    currentStock: number;
    salesQuantity: number;
    turnoverRate: number;
    daysOfSupply: number;
    inventoryValue: number;
  }>;
};

type ForecastData = {
  historical: Array<{ month: string; revenue: number; quantity: number }>;
  forecast: Array<{ month: string; revenue: number; quantity: number; isForecast: boolean }>;
  trend: string;
  growthRate: number;
  slope: number;
};

type Tab = "overview" | "ranking" | "roas" | "pl" | "turnover" | "forecast";

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [months, setMonths] = useState(3);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [rankSort, setRankSort] = useState("revenue");
  const [rankLoading, setRankLoading] = useState(false);
  const [adData, setAdData] = useState<AdSummary | null>(null);
  const [adLoading, setAdLoading] = useState(false);
  const [plData, setPlData] = useState<PLData | null>(null);
  const [plLoading, setPlLoading] = useState(false);
  const [turnoverData, setTurnoverData] = useState<TurnoverData | null>(null);
  const [turnoverLoading, setTurnoverLoading] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

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

  useEffect(() => {
    if (tab === "roas") {
      setAdLoading(true);
      fetch(`/api/analytics/ad-costs?months=${months}`)
        .then((r) => r.json())
        .then((d) => {
          setAdData(d);
          setAdLoading(false);
        });
    }
  }, [tab, months]);

  useEffect(() => {
    if (tab === "turnover") {
      setTurnoverLoading(true);
      fetch(`/api/analytics/turnover?months=${months}`)
        .then((r) => r.json())
        .then((d) => { setTurnoverData(d); setTurnoverLoading(false); });
    }
  }, [tab, months]);

  useEffect(() => {
    if (tab === "forecast") {
      setForecastLoading(true);
      fetch("/api/analytics/forecast")
        .then((r) => r.json())
        .then((d) => { setForecastData(d); setForecastLoading(false); });
    }
  }, [tab]);

  useEffect(() => {
    if (tab === "pl") {
      setPlLoading(true);
      fetch(`/api/analytics/product-pl?months=${months}`)
        .then((r) => r.json())
        .then((d) => {
          setPlData(d);
          setPlLoading(false);
        });
    }
  }, [tab, months]);

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

  const tabs: { value: Tab; label: string }[] = [
    { value: "overview", label: "概要" },
    { value: "ranking", label: "ランキング" },
    { value: "roas", label: "広告ROAS" },
    { value: "pl", label: "P&L" },
    { value: "turnover", label: "回転率" },
    { value: "forecast", label: "予測" },
  ];

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">分析ダッシュボード</h1>
          <p className="text-sm text-gray-500">売上・在庫・広告・損益の統合分析</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {tabs.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`px-3 py-1.5 text-sm ${tab === t.value ? "bg-gray-900 text-white" : "bg-white text-gray-600"}`}
              >
                {t.label}
              </button>
            ))}
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

      {tab === "roas" ? (
        <RoasTab data={adData} loading={adLoading} />
      ) : tab === "pl" ? (
        <PLTab data={plData} loading={plLoading} />
      ) : tab === "turnover" ? (
        <TurnoverTab data={turnoverData} loading={turnoverLoading} />
      ) : tab === "forecast" ? (
        <ForecastTab data={forecastData} loading={forecastLoading} />
      ) : tab === "ranking" ? (
        <RankingTab
          ranking={ranking}
          loading={rankLoading}
          rankSort={rankSort}
          setRankSort={setRankSort}
        />
      ) : (
        <OverviewTab data={data} totalCategorySales={totalCategorySales} />
      )}
    </div>
  );
}

function RoasTab({ data, loading }: { data: AdSummary | null; loading: boolean }) {
  if (loading || !data) return <p className="text-gray-500">読み込み中...</p>;

  const s = data.summary;
  return (
    <div>
      <div className="grid grid-cols-5 gap-3 mb-6">
        <KpiCard label="広告費" value={`¥${s.totalSpend.toLocaleString()}`} />
        <KpiCard label="広告売上" value={`¥${s.totalConvRevenue.toLocaleString()}`} />
        <KpiCard label="ROAS" value={`${s.roas.toFixed(2)}x`} highlight={s.roas < 1 ? "red" : s.roas > 3 ? "green" : undefined} />
        <KpiCard label="CPA" value={`¥${Math.round(s.cpa).toLocaleString()}`} />
        <KpiCard label="CVR" value={`${s.cvr.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">チャネル別パフォーマンス</h3>
          {data.byChannel.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">チャネル</th>
                  <th className="pb-2 font-medium text-right">広告費</th>
                  <th className="pb-2 font-medium text-right">売上</th>
                  <th className="pb-2 font-medium text-right">ROAS</th>
                  <th className="pb-2 font-medium text-right">CTR</th>
                  <th className="pb-2 font-medium text-right">CPA</th>
                </tr>
              </thead>
              <tbody>
                {data.byChannel.map((c) => (
                  <tr key={c.channel} className="border-b border-gray-50">
                    <td className="py-2 font-medium">{c.channel}</td>
                    <td className="py-2 text-right">¥{c.spend.toLocaleString()}</td>
                    <td className="py-2 text-right">¥{c.revenue.toLocaleString()}</td>
                    <td className="py-2 text-right">
                      <span className={c.roas < 1 ? "text-red-600" : c.roas > 3 ? "text-green-600" : ""}>
                        {c.roas.toFixed(2)}x
                      </span>
                    </td>
                    <td className="py-2 text-right">{c.ctr.toFixed(1)}%</td>
                    <td className="py-2 text-right">¥{Math.round(c.cpa).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-400 text-sm">広告データがありません</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">月次広告推移</h3>
          {data.byMonth.length > 0 ? (
            <div className="space-y-2">
              {data.byMonth.map((m) => {
                const maxSpend = Math.max(...data.byMonth.map((x) => x.spend));
                const pct = maxSpend > 0 ? (m.spend / maxSpend) * 100 : 0;
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16">{m.month}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden relative">
                      <div className="h-full bg-orange-400 rounded" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right">
                      {m.roas.toFixed(1)}x
                    </span>
                    <span className="text-xs text-gray-600 w-20 text-right">
                      ¥{m.spend.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">データなし</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PLTab({ data, loading }: { data: PLData | null; loading: boolean }) {
  if (loading || !data) return <p className="text-gray-500">読み込み中...</p>;

  const s = data.summary;
  return (
    <div>
      <div className="grid grid-cols-5 gap-3 mb-6">
        <KpiCard label="売上" value={`¥${s.totalRevenue.toLocaleString()}`} />
        <KpiCard label="原価" value={`¥${s.totalCogs.toLocaleString()}`} />
        <KpiCard label="粗利" value={`¥${s.totalGrossProfit.toLocaleString()}`} />
        <KpiCard label="広告費" value={`¥${s.totalAdSpend.toLocaleString()}`} />
        <KpiCard
          label="営業利益"
          value={`¥${s.totalOperatingProfit.toLocaleString()}`}
          highlight={s.totalOperatingProfit < 0 ? "red" : "green"}
        />
      </div>

      {s.unallocatedAdSpend > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-700">
          未配分広告費: ¥{s.unallocatedAdSpend.toLocaleString()}（商品に紐付いていない広告費）
        </div>
      )}

      {data.products.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">商品名</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium text-right">売上</th>
                <th className="px-4 py-3 font-medium text-right">原価</th>
                <th className="px-4 py-3 font-medium text-right">粗利</th>
                <th className="px-4 py-3 font-medium text-right">粗利率</th>
                <th className="px-4 py-3 font-medium text-right">広告費</th>
                <th className="px-4 py-3 font-medium text-right">営業利益</th>
                <th className="px-4 py-3 font-medium text-right">営業利益率</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p.productId} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 text-right">¥{p.revenue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-500">¥{p.cogs.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.grossProfit < 0 ? "text-red-600" : ""}>
                      ¥{p.grossProfit.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.grossMargin < 30 ? "text-red-600" : p.grossMargin > 60 ? "text-green-600" : "text-gray-600"}>
                      {p.grossMargin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {p.adSpend > 0 ? `¥${p.adSpend.toLocaleString()}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.operatingProfit < 0 ? "text-red-600 font-medium" : "text-green-700"}>
                      ¥{p.operatingProfit.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.operatingMargin < 0 ? "text-red-600" : p.operatingMargin > 40 ? "text-green-600" : "text-gray-600"}>
                      {p.operatingMargin.toFixed(1)}%
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
  );
}

function RankingTab({
  ranking,
  loading,
  rankSort,
  setRankSort,
}: {
  ranking: RankingItem[];
  loading: boolean;
  rankSort: string;
  setRankSort: (v: string) => void;
}) {
  return (
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
      {loading ? (
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
  );
}

function OverviewTab({ data, totalCategorySales }: { data: DashboardData; totalCategorySales: number }) {
  return (
    <>
      <div className="grid grid-cols-6 gap-3 mb-6">
        <KpiCard label="売上" value={`¥${data.kpi.totalRevenue.toLocaleString()}`} />
        <KpiCard label="販売数" value={`${data.kpi.totalQuantity.toLocaleString()}個`} />
        <KpiCard label="平均単価" value={`¥${data.kpi.avgOrderValue.toLocaleString()}`} />
        <KpiCard label="在庫数" value={`${data.kpi.totalStock.toLocaleString()}個`} />
        <KpiCard label="在庫金額" value={`¥${data.kpi.inventoryValue.toLocaleString()}`} />
        <KpiCard label="SKU数" value={`${data.kpi.productCount}`} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{data.alertSummary.critical}</p>
          <p className="text-xs text-red-500">要リオーダー</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-600">{data.alertSummary.warning}</p>
          <p className="text-xs text-yellow-500">注意</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{data.alertSummary.safe}</p>
          <p className="text-xs text-green-500">余裕あり</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">月次売上推移</h3>
          {data.monthlySales.length > 0 ? (
            <div className="space-y-2">
              {data.monthlySales.map((m) => {
                const maxRevenue = Math.max(...data.monthlySales.map((s) => s.revenue));
                const pct = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16">{m.month}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                      <div className="h-full bg-blue-400 rounded" style={{ width: `${pct}%` }} />
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
          <h3 className="text-sm font-semibold text-gray-700 mb-3">カテゴリ別売上構成</h3>
          {data.categorySales.length > 0 ? (
            <div className="space-y-2">
              {data.categorySales.map((c) => {
                const pct = totalCategorySales > 0
                  ? ((c.revenue / totalCategorySales) * 100).toFixed(1) : "0";
                return (
                  <div key={c.category} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-24">{c.category}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                      <div className="h-full bg-purple-400 rounded"
                        style={{ width: `${(c.revenue / totalCategorySales) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">{pct}%</span>
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
  );
}

function TurnoverTab({ data, loading }: { data: TurnoverData | null; loading: boolean }) {
  if (loading || !data) return <p className="text-gray-500">読み込み中...</p>;

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-6">
        <KpiCard label="平均回転率" value={`${data.summary.avgTurnover}回/年`} />
        <KpiCard label="在庫金額" value={`¥${data.summary.totalInventoryValue.toLocaleString()}`} />
        <KpiCard label="売上原価" value={`¥${data.summary.totalCogs.toLocaleString()}`} />
        <KpiCard label="対象SKU" value={`${data.summary.productCount}`} />
      </div>

      {data.products.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">商品名</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">分類</th>
                <th className="px-4 py-3 font-medium text-right">在庫</th>
                <th className="px-4 py-3 font-medium text-right">販売数</th>
                <th className="px-4 py-3 font-medium text-right">回転率</th>
                <th className="px-4 py-3 font-medium text-right">在庫日数</th>
                <th className="px-4 py-3 font-medium text-right">在庫金額</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p.productId} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      p.productClass === "定番" ? "bg-blue-50 text-blue-700" :
                      p.productClass === "セミ定番" ? "bg-purple-50 text-purple-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>{p.productClass}</span>
                  </td>
                  <td className="px-4 py-3 text-right">{p.currentStock}</td>
                  <td className="px-4 py-3 text-right">{p.salesQuantity}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.turnoverRate < 2 ? "text-red-600 font-medium" : p.turnoverRate > 6 ? "text-green-600" : ""}>
                      {p.turnoverRate}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.daysOfSupply > 180 ? "text-red-600" : ""}>
                      {p.daysOfSupply >= 999 ? "∞" : `${p.daysOfSupply}日`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    ¥{p.inventoryValue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">データがありません</p>
        </div>
      )}
    </div>
  );
}

function ForecastTab({ data, loading }: { data: ForecastData | null; loading: boolean }) {
  if (loading || !data) return <p className="text-gray-500">読み込み中...</p>;

  const trendLabel: Record<string, { text: string; color: string }> = {
    growing: { text: "成長トレンド", color: "text-green-600" },
    declining: { text: "下降トレンド", color: "text-red-600" },
    stable: { text: "安定", color: "text-blue-600" },
    insufficient_data: { text: "データ不足", color: "text-gray-500" },
  };

  const trend = trendLabel[data.trend] || trendLabel.insufficient_data;
  const allMonths = [
    ...data.historical.map((h) => ({ ...h, isForecast: false })),
    ...data.forecast,
  ];

  const maxRevenue = Math.max(...allMonths.map((m) => m.revenue), 1);

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <KpiCard label="トレンド" value={trend.text} highlight={data.trend === "declining" ? "red" : data.trend === "growing" ? "green" : undefined} />
        <KpiCard label="成長率（6ヶ月）" value={`${data.growthRate > 0 ? "+" : ""}${data.growthRate}%`} highlight={data.growthRate < 0 ? "red" : "green"} />
        <KpiCard label="月次変動" value={`¥${Math.abs(data.slope).toLocaleString()}/月`} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">売上推移 + 3ヶ月予測</h3>
        <div className="space-y-2">
          {allMonths.map((m) => {
            const pct = (m.revenue / maxRevenue) * 100;
            return (
              <div key={m.month} className="flex items-center gap-3">
                <span className={`text-xs w-16 ${m.isForecast ? "text-orange-500 font-medium" : "text-gray-500"}`}>
                  {m.month}
                </span>
                <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                  <div
                    className={`h-full rounded ${m.isForecast ? "bg-orange-300" : "bg-blue-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-xs w-24 text-right ${m.isForecast ? "text-orange-600" : "text-gray-600"}`}>
                  ¥{m.revenue.toLocaleString()}
                </span>
                {m.isForecast && (
                  <span className="text-[10px] text-orange-400">予測</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {data.forecast.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">月</th>
                <th className="px-4 py-3 font-medium text-right">予測売上</th>
                <th className="px-4 py-3 font-medium text-right">予測販売数</th>
              </tr>
            </thead>
            <tbody>
              {data.forecast.map((f) => (
                <tr key={f.month} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-medium text-orange-600">{f.month}</td>
                  <td className="px-4 py-3 text-right">¥{f.revenue.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{f.quantity}個</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, highlight }: { label: string; value: string; highlight?: "red" | "green" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <p className={`text-lg font-bold ${
        highlight === "red" ? "text-red-600" :
        highlight === "green" ? "text-green-600" :
        "text-gray-900"
      }`}>{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
