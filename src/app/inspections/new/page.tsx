"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Order = {
  id: string;
  quantity: number;
  status: string;
  products: { id: string; name: string; sku: string };
  suppliers: { name: string };
};

type DefectRow = {
  reason: string;
  quantity: number;
  notes: string;
};

const DEFECT_REASONS = ["キズ", "変色", "歪み", "サイズ不良", "その他"];

export default function NewInspectionPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [goodQty, setGoodQty] = useState("");
  const [defectRows, setDefectRows] = useState<DefectRow[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/orders?status=国内配送")
      .then((r) => r.json())
      .then((data) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  const totalDefects = defectRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  const good = Number(goodQty) || 0;
  const inspectedTotal = good + totalDefects;
  const missing = selectedOrder ? selectedOrder.quantity - inspectedTotal : 0;

  function addDefectRow() {
    setDefectRows([...defectRows, { reason: DEFECT_REASONS[0], quantity: 0, notes: "" }]);
  }

  function updateDefectRow(index: number, field: keyof DefectRow, value: string | number) {
    setDefectRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function removeDefectRow(index: number) {
    setDefectRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrder) return;
    setSaving(true);

    const res = await fetch("/api/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: selectedOrderId,
        product_id: selectedOrder.products.id,
        inspected_quantity: inspectedTotal,
        good_quantity: good,
        defective_quantity: totalDefects,
        missing_quantity: Math.max(0, missing),
        notes: notes || null,
        defective_details: defectRows.filter((r) => r.quantity > 0),
      }),
    });

    if (res.ok) {
      router.push("/inspections");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">検品登録</h1>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">検品登録</h1>
        <button
          onClick={() => router.push("/inspections")}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 戻る
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            検品可能な発注（ステータス: 国内配送）がありません。
          </p>
          <p className="text-sm text-gray-400 mt-1">
            生産管理で発注のステータスを「国内配送」にしてください。
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                対象発注
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              >
                <option value="">発注を選択...</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.products.name} ({o.products.sku}) — {o.suppliers.name} /
                    発注数: {o.quantity}
                  </option>
                ))}
              </select>
            </div>

            {selectedOrder && (
              <>
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="text-gray-600">
                    商品: <span className="font-medium">{selectedOrder.products.name}</span>
                    {" / "}発注数: <span className="font-medium">{selectedOrder.quantity}個</span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    良品数
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={goodQty}
                    onChange={(e) => setGoodQty(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      不良品詳細
                    </label>
                    <button
                      type="button"
                      onClick={addDefectRow}
                      className="text-xs px-2 py-1 border border-gray-200 rounded hover:bg-gray-50"
                    >
                      + 追加
                    </button>
                  </div>
                  {defectRows.length > 0 && (
                    <div className="space-y-2">
                      {defectRows.map((row, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <select
                            value={row.reason}
                            onChange={(e) =>
                              updateDefectRow(i, "reason", e.target.value)
                            }
                            className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                          >
                            {DEFECT_REASONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={0}
                            value={row.quantity}
                            onChange={(e) =>
                              updateDefectRow(i, "quantity", Number(e.target.value))
                            }
                            placeholder="数量"
                            className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeDefectRow(i)}
                            className="text-gray-400 hover:text-red-500 text-sm"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <p className="text-gray-600">
                    良品: <span className="font-medium text-green-600">{good}</span>
                    {" / "}不良: <span className="font-medium text-red-600">{totalDefects}</span>
                    {" / "}合計: <span className="font-medium">{inspectedTotal}</span>
                  </p>
                  {missing > 0 && (
                    <p className="text-orange-600">
                      未着: {missing}個（発注数{selectedOrder.quantity} − 検品{inspectedTotal}）
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    備考
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                </div>
              </>
            )}
          </div>

          {selectedOrder && (
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving || !goodQty}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "保存中..." : "検品記録を保存"}
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
