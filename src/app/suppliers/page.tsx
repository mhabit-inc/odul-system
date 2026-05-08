"use client";

import { useState, useEffect } from "react";

type Supplier = {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  lead_time_days: number;
  has_inspection_columns: boolean;
  notes: string;
  created_at: string;
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    email: "",
    phone: "",
    lead_time_days: 30,
    has_inspection_columns: false,
    notes: "",
  });

  const fetchData = () => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d) => {
        setSuppliers(Array.isArray(d) ? d : []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setForm({ name: "", code: "", email: "", phone: "", lead_time_days: 30, has_inspection_columns: false, notes: "" });
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;

    if (editing) {
      await fetch(`/api/suppliers/${editing}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    resetForm();
    fetchData();
  };

  const startEdit = (s: Supplier) => {
    setForm({
      name: s.name || "",
      code: s.code || "",
      email: s.email || "",
      phone: s.phone || "",
      lead_time_days: s.lead_time_days || 30,
      has_inspection_columns: s.has_inspection_columns || false,
      notes: s.notes || "",
    });
    setEditing(s.id);
    setShowForm(true);
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">仕入先マスタ</h1>
          <p className="text-sm text-gray-500">{suppliers.length}件</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          + 新規登録
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            {editing ? "仕入先を編集" : "新規仕入先"}
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-500">名前 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">コード</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">リードタイム(日)</label>
              <input
                type="number"
                value={form.lead_time_days}
                onChange={(e) => setForm({ ...form, lead_time_days: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">メール</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">電話</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm mt-1"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.has_inspection_columns}
                  onChange={(e) => setForm({ ...form, has_inspection_columns: e.target.checked })}
                  className="rounded"
                />
                検品カラムあり
              </label>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs text-gray-500">備考</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-lg text-sm mt-1"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
            >
              {editing ? "更新" : "登録"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : suppliers.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">名前</th>
                <th className="px-4 py-3 font-medium">コード</th>
                <th className="px-4 py-3 font-medium">連絡先</th>
                <th className="px-4 py-3 font-medium text-right">リードタイム</th>
                <th className="px-4 py-3 font-medium">備考</th>
                <th className="px-4 py-3 font-medium text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.code || "-"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {s.email && <div>{s.email}</div>}
                    {s.phone && <div>{s.phone}</div>}
                    {!s.email && !s.phone && "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {s.lead_time_days ? `${s.lead_time_days}日` : "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-48 truncate">
                    {s.notes || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => startEdit(s)}
                      className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900"
                    >
                      編集
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">仕入先が登録されていません</p>
        </div>
      )}
    </div>
  );
}
