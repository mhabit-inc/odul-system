"use client";

import { useState, useEffect, useCallback } from "react";

type PendingProduct = {
  id: string;
  sku: string;
  name: string;
  name_en: string;
  category: string;
  launched_at: string;
  product_class: string;
};

type ClassificationResult = {
  pending_preliminary: PendingProduct[];
  pending_confirmed: PendingProduct[];
  summary: {
    total_products: number;
    staple: number;
    semi_staple: number;
    unclassified: number;
    pending_preliminary: number;
    pending_confirmed: number;
  };
};

export default function ClassificationsPage() {
  const [data, setData] = useState<ClassificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/classifications/pending");
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function classify(productId: string, classType: string, stage: string) {
    setClassifying(productId);
    await fetch("/api/classifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        class_type: classType,
        stage,
        reason: "手動分類",
        classified_by: "user",
      }),
    });
    await fetchData();
    setClassifying(null);
  }

  if (loading) {
    return (
      <div className="max-w-6xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">商品分類</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">商品分類</h1>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryCard label="定番" value={data.summary.staple} color="text-blue-600" />
        <SummaryCard label="セミ定番" value={data.summary.semi_staple} color="text-purple-600" />
        <SummaryCard label="未分類" value={data.summary.unclassified} color="text-gray-500" />
        <SummaryCard
          label="分類待ち"
          value={data.summary.pending_preliminary + data.summary.pending_confirmed}
          color="text-orange-600"
        />
      </div>

      <Section title="仮分類待ち（発売7日経過）" badge={data.pending_preliminary.length}>
        {data.pending_preliminary.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">商品名</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">カテゴリー</th>
                <th className="px-4 py-3 font-medium">発売日</th>
                <th className="px-4 py-3 font-medium text-right">アクション</th>
              </tr>
            </thead>
            <tbody>
              {data.pending_preliminary.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.name || p.name_en || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 text-gray-500">{p.category || "-"}</td>
                  <td className="px-4 py-3 text-gray-500">{p.launched_at || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <ClassifyButtons
                      productId={p.id}
                      stage="preliminary"
                      classifying={classifying}
                      onClassify={classify}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-gray-500 text-sm text-center">仮分類待ちの商品はありません。</p>
        )}
      </Section>

      <Section title="本分類待ち（発売90日経過）" badge={data.pending_confirmed.length}>
        {data.pending_confirmed.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">商品名</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">カテゴリー</th>
                <th className="px-4 py-3 font-medium">現在の分類</th>
                <th className="px-4 py-3 font-medium">発売日</th>
                <th className="px-4 py-3 font-medium text-right">アクション</th>
              </tr>
            </thead>
            <tbody>
              {data.pending_confirmed.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.name || p.name_en || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 text-gray-500">{p.category || "-"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700">
                      {p.product_class}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.launched_at || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <ClassifyButtons
                      productId={p.id}
                      stage="confirmed"
                      classifying={classifying}
                      onClassify={classify}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-gray-500 text-sm text-center">本分類待ちの商品はありません。</p>
        )}
      </Section>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {badge > 0 && (
          <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
            {badge}件
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function ClassifyButtons({
  productId,
  stage,
  classifying,
  onClassify,
}: {
  productId: string;
  stage: string;
  classifying: string | null;
  onClassify: (id: string, classType: string, stage: string) => void;
}) {
  const isLoading = classifying === productId;
  return (
    <div className="flex gap-2 justify-end">
      <button
        onClick={() => onClassify(productId, "定番", stage)}
        disabled={isLoading}
        className="px-3 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
      >
        定番
      </button>
      <button
        onClick={() => onClassify(productId, "セミ定番", stage)}
        disabled={isLoading}
        className="px-3 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50"
      >
        セミ定番
      </button>
    </div>
  );
}
