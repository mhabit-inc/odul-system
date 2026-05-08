"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  sku: string;
  name: string;
  name_en: string | null;
  cost_price_inr: number | null;
  supplier_id: string | null;
};

type Supplier = {
  id: string;
  name: string;
  code: string;
  lead_time_days: number;
};

export default function NewOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    product_id: "",
    supplier_id: "",
    quantity: "",
    unit_cost: "",
    ordered_at: new Date().toISOString().slice(0, 10),
    expected_delivery: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/products?limit=1000").then((r) => r.json()),
      fetch("/api/suppliers").then((r) => r.json()),
    ]).then(([p, s]) => {
      const productList = Array.isArray(p) ? p : p.products || [];
      setProducts(productList);
      setSuppliers(Array.isArray(s) ? s : []);
      setLoading(false);
    });
  }, []);

  function handleProductSelect(productId: string) {
    const product = products.find((p) => p.id === productId);
    setForm((prev) => ({
      ...prev,
      product_id: productId,
      supplier_id: product?.supplier_id || prev.supplier_id,
      unit_cost: product?.cost_price_inr
        ? String(product.cost_price_inr)
        : prev.unit_cost,
    }));
  }

  function handleSupplierSelect(supplierId: string) {
    const supplier = suppliers.find((s) => s.id === supplierId);
    setForm((prev) => {
      const newForm = { ...prev, supplier_id: supplierId };
      if (supplier && prev.ordered_at) {
        const d = new Date(prev.ordered_at);
        d.setDate(d.getDate() + supplier.lead_time_days);
        newForm.expected_delivery = d.toISOString().slice(0, 10);
      }
      return newForm;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const qty = Number(form.quantity);
    const unitCost = Number(form.unit_cost) || 0;

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: form.product_id,
        supplier_id: form.supplier_id,
        quantity: qty,
        unit_cost: unitCost,
        total_cost: qty * unitCost,
        ordered_at: form.ordered_at || null,
        expected_delivery: form.expected_delivery || null,
        notes: form.notes || null,
      }),
    });

    if (res.ok) {
      router.push("/production");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">新規発注</h1>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const selectedSupplier = suppliers.find((s) => s.id === form.supplier_id);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">新規発注</h1>
        <button
          onClick={() => router.push("/production")}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 戻る
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              商品
            </label>
            <select
              value={form.product_id}
              onChange={(e) => handleProductSelect(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
            >
              <option value="">商品を選択...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name || p.name_en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メーカー
            </label>
            <select
              value={form.supplier_id}
              onChange={(e) => handleSupplierSelect(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
            >
              <option value="">メーカーを選択...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) — LT {s.lead_time_days}日
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                数量
              </label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: e.target.value })
                }
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                単価(INR)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.unit_cost}
                onChange={(e) =>
                  setForm({ ...form, unit_cost: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                発注日
              </label>
              <input
                type="date"
                value={form.ordered_at}
                onChange={(e) =>
                  setForm({ ...form, ordered_at: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                納品予定日
                {selectedSupplier && (
                  <span className="text-xs text-gray-400 ml-1">
                    (LT {selectedSupplier.lead_time_days}日)
                  </span>
                )}
              </label>
              <input
                type="date"
                value={form.expected_delivery}
                onChange={(e) =>
                  setForm({ ...form, expected_delivery: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
          </div>

          {form.quantity && form.unit_cost && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                合計金額:{" "}
                <span className="font-semibold">
                  {(
                    Number(form.quantity) * Number(form.unit_cost)
                  ).toLocaleString()}{" "}
                  INR
                </span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              備考
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "保存中..." : "発注を作成"}
          </button>
        </div>
      </form>
    </div>
  );
}
