"use client";

import { useState, useEffect } from "react";

type Event = {
  id: string;
  name: string;
  type: string;
  start_date: string;
  end_date: string;
  sales_coefficient: number;
  target_amount: number | null;
  notes: string | null;
};

const EVENT_TYPES = [
  { value: "seasonal", label: "季節イベント" },
  { value: "popup", label: "POPUP" },
  { value: "campaign", label: "キャンペーン" },
];

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const emptyForm = {
    name: "",
    type: "seasonal",
    start_date: "",
    end_date: "",
    sales_coefficient: "1.0",
    target_amount: "",
    notes: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    const res = await fetch("/api/events");
    const data = await res.json();
    setEvents(data);
    setLoading(false);
  }

  function startEdit(ev: Event) {
    setEditId(ev.id);
    setFormData({
      name: ev.name,
      type: ev.type,
      start_date: ev.start_date,
      end_date: ev.end_date,
      sales_coefficient: String(ev.sales_coefficient),
      target_amount: ev.target_amount ? String(ev.target_amount) : "",
      notes: ev.notes || "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...formData,
      sales_coefficient: Number(formData.sales_coefficient),
      target_amount: formData.target_amount ? Number(formData.target_amount) : null,
      notes: formData.notes || null,
    };

    if (editId) {
      await fetch("/api/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, ...payload }),
      });
    } else {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setShowForm(false);
    setEditId(null);
    setFormData(emptyForm);
    fetchEvents();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("このイベントを削除しますか？")) return;
    await fetch("/api/events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchEvents();
  }

  function getTypeLabel(type: string) {
    return EVENT_TYPES.find((t) => t.value === type)?.label || type;
  }

  function getTypeBadgeClass(type: string) {
    switch (type) {
      case "seasonal":
        return "bg-blue-50 text-blue-700";
      case "popup":
        return "bg-orange-50 text-orange-700";
      case "campaign":
        return "bg-purple-50 text-purple-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  }

  function isActive(event: Event) {
    const today = new Date().toISOString().slice(0, 10);
    return event.start_date <= today && event.end_date >= today;
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">イベント管理</h1>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">イベント管理</h1>
          <p className="text-sm text-gray-500">
            イベント登録と売上係数の設定
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); if (showForm) { setEditId(null); setFormData(emptyForm); } }}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          {showForm ? "キャンセル" : "+ 新規イベント"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
        >
          <h2 className="text-lg font-semibold mb-4">{editId ? "イベント編集" : "新規イベント登録"}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                イベント名
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="例: クリスマスセール"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                種別
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                売上係数
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={formData.sales_coefficient}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sales_coefficient: e.target.value,
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                1.0=通常、1.5=1.5倍の売上を想定
              </p>
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
                売上目標（任意）
              </label>
              <input
                type="number"
                value={formData.target_amount}
                onChange={(e) =>
                  setFormData({ ...formData, target_amount: e.target.value })
                }
                placeholder="¥500,000"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備考
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "保存中..." : editId ? "更新する" : "登録する"}
            </button>
          </div>
        </form>
      )}

      {events.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">イベント名</th>
                <th className="px-4 py-3 font-medium">種別</th>
                <th className="px-4 py-3 font-medium">期間</th>
                <th className="px-4 py-3 font-medium text-right">売上係数</th>
                <th className="px-4 py-3 font-medium text-right">売上目標</th>
                <th className="px-4 py-3 font-medium">状態</th>
                <th className="px-4 py-3 font-medium text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr
                  key={ev.id}
                  className="border-b border-gray-50 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{ev.name}</div>
                    {ev.notes && (
                      <div className="text-xs text-gray-400">{ev.notes}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getTypeBadgeClass(ev.type)}`}
                    >
                      {getTypeLabel(ev.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {ev.start_date} ~ {ev.end_date}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        Number(ev.sales_coefficient) > 1
                          ? "text-orange-600 font-medium"
                          : "text-gray-500"
                      }
                    >
                      {ev.sales_coefficient}x
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {ev.target_amount
                      ? `¥${Number(ev.target_amount).toLocaleString()}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {isActive(ev) ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                        開催中
                      </span>
                    ) : new Date(ev.start_date) > new Date() ? (
                      <span className="text-xs text-gray-400">予定</span>
                    ) : (
                      <span className="text-xs text-gray-400">終了</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => startEdit(ev)} className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50">編集</button>
                      <button onClick={() => handleDelete(ev.id)} className="px-2 py-1 border border-red-200 rounded text-xs text-red-500 hover:bg-red-50">削除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">イベントが登録されていません。</p>
          <p className="text-sm text-gray-400 mt-1">
            イベントを登録すると、リオーダー計算時に売上係数が加味されます。
          </p>
        </div>
      )}
    </div>
  );
}
