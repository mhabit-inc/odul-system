"use client";

import { useState, useEffect } from "react";

type Season = {
  id: string;
  name: string;
  year: number;
  start_date: string;
  end_date: string;
  shooting_date: string | null;
  shooting_cost: number | null;
  uses_previous_creative: boolean;
  notes: string | null;
};

const SEASON_NAMES = [
  "PRE SS",
  "SS",
  "SS SUMMER",
  "アニバーサリー&AW",
  "ホリデー",
  "福袋",
];

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: SEASON_NAMES[0],
    year: new Date().getFullYear(),
    start_date: "",
    end_date: "",
    shooting_date: "",
    shooting_cost: "",
    uses_previous_creative: false,
    concept_theme: "",
    notes: "",
  });

  useEffect(() => {
    fetchSeasons();
  }, []);

  async function fetchSeasons() {
    const res = await fetch("/api/seasons");
    const data = await res.json();
    setSeasons(data);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        shooting_cost: formData.shooting_cost
          ? Number(formData.shooting_cost)
          : null,
        shooting_date: formData.shooting_date || null,
        notes: [formData.concept_theme ? `[テーマ] ${formData.concept_theme}` : "", formData.notes].filter(Boolean).join("\n") || null,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setFormData({
        name: SEASON_NAMES[0],
        year: new Date().getFullYear(),
        start_date: "",
        end_date: "",
        shooting_date: "",
        shooting_cost: "",
        uses_previous_creative: false,
        concept_theme: "",
        notes: "",
      });
      fetchSeasons();
    }
    setSaving(false);
  }

  function getThursdays(startDate: string, endDate: string): string[] {
    if (!startDate || !endDate) return [];
    const result: string[] = [];
    const d = new Date(startDate);
    const end = new Date(endDate);
    while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
    while (d <= end) {
      result.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 7);
    }
    return result;
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">シーズン管理</h1>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">シーズン管理</h1>
          <p className="text-sm text-gray-500">
            {seasons.length}件のシーズン
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          {showForm ? "キャンセル" : "+ 新規シーズン"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
        >
          <h2 className="text-lg font-semibold mb-4">新規シーズン登録</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                シーズン名
              </label>
              <select
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              >
                {SEASON_NAMES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                年
              </label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始日
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                終了日
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                撮影日
              </label>
              <input
                type="date"
                value={formData.shooting_date}
                onChange={(e) =>
                  setFormData({ ...formData, shooting_date: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                撮影コスト
              </label>
              <input
                type="number"
                value={formData.shooting_cost}
                onChange={(e) =>
                  setFormData({ ...formData, shooting_cost: e.target.value })
                }
                placeholder="¥550,000"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                コンセプト・テーマ
              </label>
              <input
                type="text"
                value={formData.concept_theme}
                onChange={(e) =>
                  setFormData({ ...formData, concept_theme: e.target.value })
                }
                placeholder="例: Urban Elegance / 都市と自然の融合"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="uses_prev"
                checked={formData.uses_previous_creative}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    uses_previous_creative: e.target.checked,
                  })
                }
                className="rounded border-gray-300"
              />
              <label htmlFor="uses_prev" className="text-sm text-gray-700">
                前回クリエイティブを流用
              </label>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備考
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
          </div>

          {formData.start_date && formData.end_date && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-500 mb-1">
                木曜発売日（自動計算）:
              </p>
              <p className="text-sm text-gray-700">
                {getThursdays(formData.start_date, formData.end_date).join(
                  ", "
                ) || "該当なし"}
              </p>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "保存中..." : "登録する"}
            </button>
          </div>
        </form>
      )}

      {seasons.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">シーズン</th>
                <th className="px-4 py-3 font-medium">年</th>
                <th className="px-4 py-3 font-medium">期間</th>
                <th className="px-4 py-3 font-medium">撮影日</th>
                <th className="px-4 py-3 font-medium text-right">
                  撮影コスト
                </th>
                <th className="px-4 py-3 font-medium">発売日数</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {s.name}
                      {s.uses_previous_creative && (
                        <span className="ml-2 text-xs text-gray-400">
                          (流用)
                        </span>
                      )}
                    </div>
                    {s.notes?.includes("[テーマ]") && (
                      <div className="text-xs text-gray-400">
                        {s.notes.split("\n").find((l: string) => l.startsWith("[テーマ]"))?.replace("[テーマ] ", "")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.year}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {s.start_date} ~ {s.end_date}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {s.shooting_date || "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {s.shooting_cost
                      ? `\u00a5${Number(s.shooting_cost).toLocaleString()}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {getThursdays(s.start_date, s.end_date).length}回
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            シーズンが登録されていません。
          </p>
          <p className="text-sm text-gray-400 mt-1">
            新規シーズンを登録して発注計画を作成しましょう。
          </p>
        </div>
      )}
    </div>
  );
}
