"use client";

import { useState, useEffect } from "react";

type ResalePlan = {
  id: string;
  product_id: string;
  planned_season_id: string | null;
  planned_month: string;
  order_deadline: string | null;
  variation_notes: string | null;
  quantity_override: number | null;
  status: string;
  created_by: string;
  products: {
    name: string;
    name_en: string | null;
    sku: string;
    category: string;
    product_class: string;
    current_stock: number;
  };
  seasons: { name: string; year: number } | null;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  name_en: string | null;
  product_class: string;
};

const STATUSES = ["planned", "ordered", "completed", "cancelled"];
const STATUS_LABELS: Record<string, string> = {
  planned: "計画中",
  ordered: "発注済",
  completed: "完了",
  cancelled: "キャンセル",
};
const STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-50 text-blue-700",
  ordered: "bg-yellow-50 text-yellow-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function ResalePlansPage() {
  const [plans, setPlans] = useState<ResalePlan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    product_id: "",
    planned_month: "",
    order_deadline: "",
    variation_notes: "",
    quantity_override: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/resale-plans").then((r) => r.json()),
      fetch("/api/products?limit=1000").then((r) => r.json()),
    ]).then(([p, prods]) => {
      setPlans(Array.isArray(p) ? p : []);
      const prodList = Array.isArray(prods) ? prods : prods.products || [];
      setProducts(prodList.filter((pr: Product) => pr.product_class === "セミ定番"));
      setLoading(false);
    });
  }, []);

  async function handleCreate() {
    setSaving(true);
    const res = await fetch("/api/resale-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: form.product_id,
        planned_month: form.planned_month.length === 7 ? form.planned_month + "-01" : form.planned_month,
        order_deadline: form.order_deadline || null,
        variation_notes: form.variation_notes || null,
        quantity_override: form.quantity_override ? Number(form.quantity_override) : null,
      }),
    });
    if (res.ok) {
      const data = await fetch("/api/resale-plans").then((r) => r.json());
      setPlans(Array.isArray(data) ? data : []);
      setShowForm(false);
      setForm({ product_id: "", planned_month: "", order_deadline: "", variation_notes: "", quantity_override: "" });
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/resale-plans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }

  if (loading) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">再販計画</h1>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">再販計画</h1>
          <p className="text-sm text-gray-500">セミ定番商品の再販スケジュール管理</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          + 再販計画を追加
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">商品（セミ定番）</label>
              <select
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              >
                <option value="">選択...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} - {p.name || p.name_en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">再販予定月</label>
              <input
                type="month"
                value={form.planned_month}
                onChange={(e) => setForm({ ...form, planned_month: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">発注期限</label>
              <input
                type="date"
                value={form.order_deadline}
                onChange={(e) => setForm({ ...form, order_deadline: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">数量（上書き）</label>
              <input
                type="number"
                value={form.quantity_override}
                onChange={(e) => setForm({ ...form, quantity_override: e.target.value })}
                placeholder="自動計算を上書き"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">バリエーション変更メモ</label>
            <input
              type="text"
              value={form.variation_notes}
              onChange={(e) => setForm({ ...form, variation_notes: e.target.value })}
              placeholder="石の変更、サイズ追加など"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={saving || !form.product_id || !form.planned_month}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "保存中..." : "追加"}
          </button>
        </div>
      )}

      {plans.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">商品</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">再販月</th>
                <th className="px-4 py-3 font-medium">発注期限</th>
                <th className="px-4 py-3 font-medium text-right">在庫</th>
                <th className="px-4 py-3 font-medium">メモ</th>
                <th className="px-4 py-3 font-medium">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.products.name || p.products.name_en}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.products.sku}</td>
                  <td className="px-4 py-3 text-gray-600">{p.planned_month?.slice(0, 7)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {p.order_deadline || "-"}
                    {p.order_deadline && new Date(p.order_deadline) < new Date() && p.status === "planned" && (
                      <span className="text-red-600 ml-1">超過</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{p.products.current_stock}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.variation_notes || "-"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={p.status}
                      onChange={(e) => updateStatus(p.id, e.target.value)}
                      className={`px-2 py-1 rounded text-xs font-medium border-0 ${STATUS_COLORS[p.status] || ""}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">再販計画がありません</p>
          <p className="text-sm text-gray-400 mt-1">セミ定番商品の再販スケジュールを登録しましょう</p>
        </div>
      )}
    </div>
  );
}
