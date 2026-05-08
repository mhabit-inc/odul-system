"use client";

import { useState, useEffect } from "react";

type PlanningCategory = {
  id: string;
  name: string;
  owner_role: string | null;
  is_new_product: boolean;
  description: string | null;
  max_styles: number | null;
  avg_order_per_size: number | null;
  max_order_quantity: number | null;
  avg_unit_price: number | null;
  expected_sell_through_90d: number | null;
  max_stones: number | null;
  launch_timing_note: string | null;
  product_type_example: string | null;
};

export default function PlanningCategoriesPage() {
  const [categories, setCategories] = useState<PlanningCategory[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlanningCategory>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    const res = await fetch("/api/planning-categories");
    const data = await res.json();
    setCategories(data);
    setLoading(false);
  }

  function startEdit(cat: PlanningCategory) {
    setEditing(cat.id);
    setEditForm({ ...cat });
  }

  function cancelEdit() {
    setEditing(null);
    setEditForm({});
  }

  async function handleSave(id: string) {
    setSaving(true);
    const res = await fetch(`/api/planning-categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditing(null);
      fetchCategories();
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          企画分類マスタ
        </h1>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">企画分類マスタ</h1>
        <p className="text-sm text-gray-500">
          新作発注計画で使用するデフォルト値を管理
        </p>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {cat.name}
                  {cat.owner_role && (
                    <span className="ml-2 text-xs text-gray-400 font-normal">
                      ({cat.owner_role})
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-400">
                  {cat.is_new_product ? "新規商品" : "既存商品ベース"}
                  {cat.description && ` — ${cat.description}`}
                </p>
              </div>
              {editing !== cat.id && (
                <button
                  onClick={() => startEdit(cat)}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  編集
                </button>
              )}
            </div>

            {editing === cat.id ? (
              <div>
                <div className="grid grid-cols-4 gap-3">
                  <Field
                    label="最大型数"
                    value={editForm.max_styles ?? ""}
                    onChange={(v) =>
                      setEditForm({ ...editForm, max_styles: v ? Number(v) : null })
                    }
                    type="number"
                  />
                  <Field
                    label="1サイズ平均発注数"
                    value={editForm.avg_order_per_size ?? ""}
                    onChange={(v) =>
                      setEditForm({
                        ...editForm,
                        avg_order_per_size: v ? Number(v) : null,
                      })
                    }
                    type="number"
                  />
                  <Field
                    label="上限発注数/型"
                    value={editForm.max_order_quantity ?? ""}
                    onChange={(v) =>
                      setEditForm({
                        ...editForm,
                        max_order_quantity: v ? Number(v) : null,
                      })
                    }
                    type="number"
                  />
                  <Field
                    label="平均単価(JPY)"
                    value={editForm.avg_unit_price ?? ""}
                    onChange={(v) =>
                      setEditForm({
                        ...editForm,
                        avg_unit_price: v ? Number(v) : null,
                      })
                    }
                    type="number"
                  />
                  <Field
                    label="90日消化率目安(%)"
                    value={editForm.expected_sell_through_90d ?? ""}
                    onChange={(v) =>
                      setEditForm({
                        ...editForm,
                        expected_sell_through_90d: v ? Number(v) : null,
                      })
                    }
                    type="number"
                  />
                  <Field
                    label="最大ストーン数"
                    value={editForm.max_stones ?? ""}
                    onChange={(v) =>
                      setEditForm({
                        ...editForm,
                        max_stones: v ? Number(v) : null,
                      })
                    }
                    type="number"
                  />
                  <Field
                    label="発売タイミング"
                    value={editForm.launch_timing_note ?? ""}
                    onChange={(v) =>
                      setEditForm({ ...editForm, launch_timing_note: v || null })
                    }
                  />
                  <Field
                    label="商品タイプ例"
                    value={editForm.product_type_example ?? ""}
                    onChange={(v) =>
                      setEditForm({
                        ...editForm,
                        product_type_example: v || null,
                      })
                    }
                  />
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => handleSave(cat.id)}
                    disabled={saving}
                    className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  >
                    {saving ? "保存中..." : "保存"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3 text-sm">
                <Stat label="最大型数" value={cat.max_styles} suffix="型" />
                <Stat
                  label="1サイズ平均"
                  value={cat.avg_order_per_size}
                  suffix="個"
                />
                <Stat
                  label="上限/型"
                  value={cat.max_order_quantity}
                  suffix="個"
                />
                <Stat
                  label="平均単価"
                  value={cat.avg_unit_price}
                  prefix="¥"
                  format
                />
                <Stat
                  label="消化率目安"
                  value={cat.expected_sell_through_90d}
                  suffix="%"
                />
                <Stat
                  label="ストーン数"
                  value={cat.max_stones}
                  suffix="個"
                />
                <Stat label="発売タイミング" text={cat.launch_timing_note} />
                <Stat label="商品タイプ例" text={cat.product_type_example} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  text,
  prefix,
  suffix,
  format,
}: {
  label: string;
  value?: number | null;
  text?: string | null;
  prefix?: string;
  suffix?: string;
  format?: boolean;
}) {
  const display = text
    ? text
    : value != null
      ? `${prefix || ""}${format ? Number(value).toLocaleString() : value}${suffix || ""}`
      : "-";
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-gray-700">{display}</p>
    </div>
  );
}
