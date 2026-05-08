"use client";

import { useState, useEffect, useCallback } from "react";

type Season = {
  id: string;
  name: string;
  year: number;
  start_date: string;
  end_date: string;
  shooting_date: string | null;
  shooting_cost: number | null;
};

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
  launch_timing_note: string | null;
  product_type_example: string | null;
};

type PlanRow = {
  category: PlanningCategory;
  styles: number;
  orderPerSize: number;
  sizeCount: number;
  launchDate: string;
};

type ExistingPlan = {
  id: string;
  season_id: string;
  planning_category_id: string;
  planned_styles: number;
  planned_quantity: number;
  expected_revenue: number | null;
  launch_date: string | null;
  status: string;
  planning_categories: PlanningCategory;
};

const SIZE_COUNT = 4; // 9, 11, 13, 15

export default function PlansPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [categories, setCategories] = useState<PlanningCategory[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [planRows, setPlanRows] = useState<PlanRow[]>([]);
  const [existingPlans, setExistingPlans] = useState<ExistingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/seasons").then((r) => r.json()),
      fetch("/api/planning-categories").then((r) => r.json()),
    ]).then(([s, c]) => {
      setSeasons(s);
      setCategories(c);
      setLoading(false);
    });
  }, []);

  const loadExistingPlans = useCallback(
    async (seasonId: string) => {
      if (!seasonId) return;
      const res = await fetch(`/api/plans?season_id=${seasonId}`);
      const data = await res.json();
      setExistingPlans(data);
    },
    []
  );

  useEffect(() => {
    if (selectedSeasonId) {
      loadExistingPlans(selectedSeasonId);
    }
  }, [selectedSeasonId, loadExistingPlans]);

  useEffect(() => {
    if (categories.length === 0 || !selectedSeasonId) return;
    const season = seasons.find((s) => s.id === selectedSeasonId);
    if (!season) return;

    const thursdays = getThursdays(season.start_date, season.end_date);

    setPlanRows(
      categories
        .filter((c) => c.name !== "再販商品")
        .map((cat) => {
          const existing = existingPlans.find(
            (p) => p.planning_category_id === cat.id
          );
          const defaultLaunch =
            cat.launch_timing_note === "シーズン2週目" && thursdays.length >= 2
              ? thursdays[1]
              : thursdays[0] || "";

          return {
            category: cat,
            styles: existing
              ? existing.planned_styles
              : cat.max_styles || 3,
            orderPerSize: cat.avg_order_per_size || 5,
            sizeCount: SIZE_COUNT,
            launchDate: existing?.launch_date || defaultLaunch,
          };
        })
    );
  }, [categories, selectedSeasonId, seasons, existingPlans]);

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

  function calcQuantity(row: PlanRow): number {
    const qty = row.styles * row.orderPerSize * row.sizeCount;
    if (row.category.max_order_quantity) {
      return Math.min(qty, row.category.max_order_quantity * row.styles);
    }
    return qty;
  }

  function calcRevenue(row: PlanRow): number {
    const price = row.category.avg_unit_price || 13000;
    const sellThrough = (row.category.expected_sell_through_90d || 65) / 100;
    return Math.round(calcQuantity(row) * price * sellThrough);
  }

  function updateRow(index: number, field: keyof PlanRow, value: number | string) {
    setPlanRows((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, [field]: value } : r
      )
    );
    setSaved(false);
  }

  const totalStyles = planRows.reduce((sum, r) => sum + r.styles, 0);
  const totalQuantity = planRows.reduce((sum, r) => sum + calcQuantity(r), 0);
  const totalRevenue = planRows.reduce((sum, r) => sum + calcRevenue(r), 0);

  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);
  const thursdays = selectedSeason
    ? getThursdays(selectedSeason.start_date, selectedSeason.end_date)
    : [];

  async function handleSave() {
    if (!selectedSeasonId) return;
    setSaving(true);

    if (existingPlans.length > 0) {
      await fetch(`/api/plans?season_id=${selectedSeasonId}`, {
        method: "DELETE",
      });
    }

    const plans = planRows.map((row) => ({
      season_id: selectedSeasonId,
      planning_category_id: row.category.id,
      planned_styles: row.styles,
      planned_quantity: calcQuantity(row),
      expected_revenue: calcRevenue(row),
      launch_date: row.launchDate || null,
    }));

    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plans }),
    });

    if (res.ok) {
      setSaved(true);
      loadExistingPlans(selectedSeasonId);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          新作発注計画
        </h1>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">新作発注計画</h1>
          <p className="text-sm text-gray-500">
            シーズン×企画分類に基づく発注数自動算出
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              シーズン
            </label>
            <select
              value={selectedSeasonId}
              onChange={(e) => {
                setSelectedSeasonId(e.target.value);
                setSaved(false);
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
            >
              <option value="">シーズンを選択...</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.year}
                </option>
              ))}
            </select>
          </div>
          {selectedSeason && (
            <div className="flex-1">
              <p className="text-sm text-gray-500">
                期間: {selectedSeason.start_date} ~ {selectedSeason.end_date}
              </p>
              <p className="text-sm text-gray-500">
                発売日: {thursdays.length}回（毎週木曜）
              </p>
              {selectedSeason.shooting_date && (
                <p className="text-sm text-gray-500">
                  撮影: {selectedSeason.shooting_date}
                  {selectedSeason.shooting_cost &&
                    ` (¥${Number(selectedSeason.shooting_cost).toLocaleString()})`}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {seasons.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            シーズンが登録されていません。
          </p>
          <p className="text-sm text-gray-400 mt-1">
            先にシーズン管理から登録してください。
          </p>
        </div>
      )}

      {selectedSeasonId && planRows.length > 0 && (
        <>
          <div className="space-y-4 mb-6">
            {planRows.map((row, i) => (
              <div
                key={row.category.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {row.category.name}
                      {row.category.owner_role && (
                        <span className="ml-2 text-xs text-gray-400 font-normal">
                          ({row.category.owner_role})
                        </span>
                      )}
                    </h3>
                    {row.category.description && (
                      <p className="text-xs text-gray-400">
                        {row.category.description}
                      </p>
                    )}
                  </div>
                  {row.category.product_type_example && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                      例: {row.category.product_type_example}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      型数{" "}
                      {row.category.max_styles &&
                        `/ 最大${row.category.max_styles}型`}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={row.category.max_styles || 99}
                      value={row.styles}
                      onChange={(e) =>
                        updateRow(i, "styles", Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      1サイズ平均発注数
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={row.orderPerSize}
                      onChange={(e) =>
                        updateRow(i, "orderPerSize", Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      サイズ展開数
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={row.sizeCount}
                      onChange={(e) =>
                        updateRow(i, "sizeCount", Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      発売日
                    </label>
                    <select
                      value={row.launchDate}
                      onChange={(e) =>
                        updateRow(i, "launchDate", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    >
                      <option value="">未定</option>
                      {thursdays.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-6 text-sm">
                  <span className="text-gray-500">
                    発注数合計:{" "}
                    <span className="font-semibold text-gray-900">
                      {calcQuantity(row).toLocaleString()}個
                    </span>
                    {row.category.max_order_quantity && (
                      <span className="text-xs text-gray-400 ml-1">
                        (上限{row.category.max_order_quantity}個/型)
                      </span>
                    )}
                  </span>
                  <span className="text-gray-500">
                    期待売上:{" "}
                    <span className="font-semibold text-gray-900">
                      ¥{calcRevenue(row).toLocaleString()}
                    </span>
                  </span>
                  <span className="text-gray-500">
                    消化率目安:{" "}
                    <span className="font-semibold text-gray-900">
                      {row.category.expected_sell_through_90d || 65}%
                    </span>
                  </span>
                  <span className="text-gray-500">
                    平均単価:{" "}
                    <span className="text-gray-700">
                      ¥
                      {(
                        row.category.avg_unit_price || 13000
                      ).toLocaleString()}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 text-white rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium mb-2">サマリー</h3>
            <div className="flex items-center gap-8">
              <div>
                <p className="text-2xl font-bold">{totalStyles}型</p>
                <p className="text-xs text-gray-300">合計型数</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {totalQuantity.toLocaleString()}個
                </p>
                <p className="text-xs text-gray-300">合計発注数</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ¥{totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-gray-300">合計期待売上</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end">
            {saved && (
              <span className="text-sm text-green-600 font-medium">
                保存しました
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "保存中..." : "下書き保存"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
