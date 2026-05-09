"use client";

import { useState, useEffect } from "react";

type Multiplier = {
  id: string;
  sell_through_min: number;
  sell_through_max: number;
  multiplier: number;
  notes: string;
};

export default function MultipliersPage() {
  const [rows, setRows] = useState<Multiplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/restock-multipliers")
      .then((r) => r.json())
      .then((d) => {
        setRows(Array.isArray(d) ? d : []);
        setLoading(false);
      });
  }, []);

  function updateRow(id: string, field: keyof Multiplier, value: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              [field]: field === "notes" ? value : parseFloat(value) || 0,
            }
          : r
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/restock-multipliers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rows),
    });
    if (res.ok) {
      setMsg("保存しました");
    } else {
      const data = await res.json();
      setMsg(`エラー: ${data.error}`);
    }
    setSaving(false);
  }

  if (loading) return <p className="text-gray-500">読み込み中...</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">再販倍率ルール</h1>
          <p className="text-sm text-gray-500">セミ定番の再発注数に掛ける倍率（売上消化率別）</p>
        </div>
        <a href="/settings" className="text-sm text-gray-500 hover:text-gray-700">← 設定に戻る</a>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b bg-gray-50">
              <th className="px-4 py-3 font-medium">消化率 最小(%)</th>
              <th className="px-4 py-3 font-medium">消化率 最大(%)</th>
              <th className="px-4 py-3 font-medium">倍率</th>
              <th className="px-4 py-3 font-medium">備考</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-50">
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={r.sell_through_min}
                    onChange={(e) => updateRow(r.id, "sell_through_min", e.target.value)}
                    className="w-20 px-2 py-1 border rounded text-sm text-center"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    value={r.sell_through_max}
                    onChange={(e) => updateRow(r.id, "sell_through_max", e.target.value)}
                    className="w-20 px-2 py-1 border rounded text-sm text-center"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    step="0.1"
                    value={r.multiplier}
                    onChange={(e) => updateRow(r.id, "multiplier", e.target.value)}
                    className="w-20 px-2 py-1 border rounded text-sm text-center"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={r.notes || ""}
                    onChange={(e) => updateRow(r.id, "notes", e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
      </div>
    </div>
  );
}
