"use client";

import { useState, useEffect } from "react";

type Threshold = {
  id: string;
  stage: string;
  staple_min: number;
  archive_max: number;
  unit: string;
  effective_from: string;
  notes: string | null;
};

export default function ThresholdsPage() {
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ staple_min: "", archive_max: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/classification-thresholds")
      .then((r) => r.json())
      .then((d) => {
        setThresholds(Array.isArray(d) ? d : []);
        setLoading(false);
      });
  }, []);

  function startEdit(t: Threshold) {
    setEditing(t.id);
    setForm({
      staple_min: String(t.staple_min),
      archive_max: String(t.archive_max),
      notes: t.notes || "",
    });
  }

  async function save(id: string) {
    setSaving(true);
    const res = await fetch("/api/classification-thresholds", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        staple_min: Number(form.staple_min),
        archive_max: Number(form.archive_max),
        notes: form.notes || null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setThresholds((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setEditing(null);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">分類閾値設定</h1>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const stageLabels: Record<string, string> = {
    preliminary: "仮分類（発売7日後）",
    confirmed: "本分類（発売90日後）",
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">分類閾値設定</h1>
      <p className="text-sm text-gray-500 mb-6">
        定番・アーカイブの自動判定に使用する閾値を設定します
      </p>

      <div className="space-y-4">
        {thresholds.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                {stageLabels[t.stage] || t.stage}
              </h2>
              {editing !== t.id && (
                <button
                  onClick={() => startEdit(t)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  編集
                </button>
              )}
            </div>

            {editing === t.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      定番候補（{t.unit === "quantity" ? "個以上" : "%以上"}）
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.staple_min}
                      onChange={(e) => setForm({ ...form, staple_min: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      アーカイブ候補（{t.unit === "quantity" ? "個以下" : "%未満"}）
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.archive_max}
                      onChange={(e) => setForm({ ...form, archive_max: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">備考</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => save(t.id)}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                  >
                    {saving ? "保存中..." : "保存"}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600 mb-1">定番候補</p>
                  <p className="text-lg font-bold text-blue-700">
                    {t.staple_min}{t.unit === "quantity" ? "個" : "%"}以上
                  </p>
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">アーカイブ候補</p>
                  <p className="text-lg font-bold text-gray-600">
                    {t.archive_max}{t.unit === "quantity" ? "個" : "%"}以下
                  </p>
                </div>
                {t.notes && (
                  <p className="col-span-2 text-xs text-gray-400">{t.notes}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
