"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

type Product = {
  id: string;
  name: string;
  name_en: string;
  sku: string;
  category: string;
  product_class: string;
  material: string;
  selling_price: number;
  cost_price_jpy: number;
  current_stock: number;
  collection_name: string;
  launched_at: string;
  shopify_product_id: string;
  vendor: string;
  created_at: string;
};

type SalesData = {
  totalRevenue: number;
  totalQuantity: number;
  monthlySales: Array<{ month: string; revenue: number; quantity: number }>;
  recent: Array<{
    id: string;
    sold_at: string;
    quantity: number;
    revenue: number;
    channel: string;
  }>;
};

type Order = {
  id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  status: string;
  ordered_at: string;
  expected_delivery: string;
  actual_delivery: string;
  suppliers: { name: string; code: string } | null;
};

type Inspection = {
  id: string;
  inspected_at: string;
  total_quantity: number;
  good_quantity: number;
  defective_quantity: number;
  defective_items: Array<{ reason: string; quantity: number }>;
};

type ClassHistory = {
  id: string;
  changed_at: string;
  from_class: string;
  to_class: string;
  reason: string;
};

type DetailData = {
  product: Product;
  sales: SalesData;
  orders: Order[];
  inspections: Inspection[];
  classificationHistory: ClassHistory[];
};

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const startEdit = () => {
    if (!data) return;
    setEditForm({
      name: data.product.name,
      name_en: data.product.name_en,
      category: data.product.category,
      material: data.product.material,
      collection_name: data.product.collection_name,
      selling_price: data.product.selling_price,
      cost_price_jpy: data.product.cost_price_jpy,
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditing(false);
    setSaving(false);
    fetchData();
  };

  if (loading || !data) {
    return (
      <div className="max-w-5xl">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const p = data.product;
  const grossMargin =
    p.selling_price && p.cost_price_jpy
      ? (
          ((Number(p.selling_price) - Number(p.cost_price_jpy)) /
            Number(p.selling_price)) *
          100
        ).toFixed(1)
      : null;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/products"
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ← 商品マスタ
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {p.name || p.name_en || "名称未設定"}
          </h1>
          <p className="text-sm text-gray-500 font-mono mt-1">{p.sku}</p>
        </div>
        <div className="flex items-center gap-2">
          <ClassBadge value={p.product_class} />
          {!editing && (
            <button
              onClick={startEdit}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              編集
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">商品情報を編集</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-500">商品名</label>
              <input
                type="text"
                value={editForm.name || ""}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">商品名(英語)</label>
              <input
                type="text"
                value={editForm.name_en || ""}
                onChange={(e) => setEditForm({ ...editForm, name_en: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">カテゴリー</label>
              <input
                type="text"
                value={editForm.category || ""}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">素材</label>
              <input
                type="text"
                value={editForm.material || ""}
                onChange={(e) => setEditForm({ ...editForm, material: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">コレクション</label>
              <input
                type="text"
                value={editForm.collection_name || ""}
                onChange={(e) => setEditForm({ ...editForm, collection_name: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">販売価格</label>
              <input
                type="number"
                value={editForm.selling_price || ""}
                onChange={(e) => setEditForm({ ...editForm, selling_price: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">原価(JPY)</label>
              <input
                type="number"
                value={editForm.cost_price_jpy || ""}
                onChange={(e) => setEditForm({ ...editForm, cost_price_jpy: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              disabled={saving}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3 mb-6">
            <InfoCard label="販売価格" value={p.selling_price ? `¥${Number(p.selling_price).toLocaleString()}` : "-"} />
            <InfoCard label="原価(JPY)" value={p.cost_price_jpy ? `¥${Number(p.cost_price_jpy).toLocaleString()}` : "-"} />
            <InfoCard label="粗利率" value={grossMargin ? `${grossMargin}%` : "-"} />
            <InfoCard label="現在庫" value={`${p.current_stock ?? 0}個`} highlight={p.current_stock <= 0} />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <InfoCard label="カテゴリー" value={p.category || "-"} />
            <InfoCard label="素材" value={p.material || "-"} />
            <InfoCard label="コレクション" value={p.collection_name || "-"} />
          </div>
        </>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <InfoCard label="Vendor" value={p.vendor || "-"} />
        <InfoCard label="発売日" value={p.launched_at || "-"} />
        <InfoCard label="Shopify ID" value={p.shopify_product_id ? `#${p.shopify_product_id}` : "-"} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <KpiCard
          label="累計売上"
          value={`¥${data.sales.totalRevenue.toLocaleString()}`}
        />
        <KpiCard
          label="累計販売数"
          value={`${data.sales.totalQuantity.toLocaleString()}個`}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            月次売上推移
          </h3>
          {data.sales.monthlySales.length > 0 ? (
            <div className="space-y-2">
              {data.sales.monthlySales.map((m) => {
                const maxRev = Math.max(
                  ...data.sales.monthlySales.map((s) => s.revenue)
                );
                const pct = maxRev > 0 ? (m.revenue / maxRev) * 100 : 0;
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16">
                      {m.month}
                    </span>
                    <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-20 text-right">
                      ¥{m.revenue.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">売上データなし</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            発注履歴
          </h3>
          {data.orders.length > 0 ? (
            <div className="space-y-2">
              {data.orders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between text-xs border-b border-gray-50 pb-2"
                >
                  <div>
                    <span className="text-gray-500">
                      {o.ordered_at?.slice(0, 10) || "未発注"}
                    </span>
                    <span className="ml-2 text-gray-700">
                      {o.suppliers?.name || "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">{o.quantity}個</span>
                    <StatusBadge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">発注履歴なし</p>
          )}
        </div>
      </div>

      {data.inspections.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            検品履歴
          </h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="text-left py-2">検品日</th>
                <th className="text-right py-2">総数</th>
                <th className="text-right py-2">良品</th>
                <th className="text-right py-2">不良</th>
                <th className="text-right py-2">不良率</th>
                <th className="text-left py-2 pl-4">不良内容</th>
              </tr>
            </thead>
            <tbody>
              {data.inspections.map((insp) => {
                const defectRate =
                  insp.total_quantity > 0
                    ? (
                        (insp.defective_quantity / insp.total_quantity) *
                        100
                      ).toFixed(1)
                    : "0";
                return (
                  <tr key={insp.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-600">
                      {insp.inspected_at?.slice(0, 10)}
                    </td>
                    <td className="py-2 text-right">{insp.total_quantity}</td>
                    <td className="py-2 text-right text-green-600">
                      {insp.good_quantity}
                    </td>
                    <td className="py-2 text-right text-red-600">
                      {insp.defective_quantity}
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className={
                          Number(defectRate) > 5
                            ? "text-red-600 font-medium"
                            : "text-gray-500"
                        }
                      >
                        {defectRate}%
                      </span>
                    </td>
                    <td className="py-2 pl-4 text-gray-500">
                      {insp.defective_items
                        ?.map(
                          (d: { reason: string; quantity: number }) =>
                            `${d.reason}(${d.quantity})`
                        )
                        .join(", ") || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data.classificationHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            分類変更履歴
          </h3>
          <div className="space-y-2">
            {data.classificationHistory.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-3 text-xs border-b border-gray-50 pb-2"
              >
                <span className="text-gray-500">
                  {h.changed_at?.slice(0, 10)}
                </span>
                <ClassBadge value={h.from_class} />
                <span className="text-gray-400">→</span>
                <ClassBadge value={h.to_class} />
                {h.reason && (
                  <span className="text-gray-400 ml-2">{h.reason}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.sales.recent.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            直近の売上明細（最大20件）
          </h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="text-left py-2">日付</th>
                <th className="text-left py-2">チャネル</th>
                <th className="text-right py-2">数量</th>
                <th className="text-right py-2">売上</th>
              </tr>
            </thead>
            <tbody>
              {data.sales.recent.map((s) => (
                <tr key={s.id} className="border-b border-gray-50">
                  <td className="py-2 text-gray-600">
                    {s.sold_at?.slice(0, 10)}
                  </td>
                  <td className="py-2 text-gray-500">{s.channel || "-"}</td>
                  <td className="py-2 text-right">{s.quantity}</td>
                  <td className="py-2 text-right">
                    ¥{Number(s.revenue).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <p
        className={`text-sm font-semibold ${highlight ? "text-red-600" : "text-gray-900"}`}
      >
        {value}
      </p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function ClassBadge({ value }: { value: string }) {
  const config: Record<string, string> = {
    定番: "bg-blue-50 text-blue-700",
    セミ定番: "bg-purple-50 text-purple-700",
    新作: "bg-orange-50 text-orange-700",
    アーカイブ: "bg-gray-200 text-gray-600",
    ノベルティ: "bg-pink-50 text-pink-700",
    未分類: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config[value] || "bg-gray-100 text-gray-500"}`}
    >
      {value}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    発注準備: "bg-gray-100 text-gray-600",
    発注済: "bg-blue-50 text-blue-700",
    製造中: "bg-yellow-50 text-yellow-700",
    出荷済: "bg-purple-50 text-purple-700",
    入荷済: "bg-green-50 text-green-700",
    検品済: "bg-green-100 text-green-800",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config[status] || "bg-gray-100 text-gray-500"}`}
    >
      {status}
    </span>
  );
}
