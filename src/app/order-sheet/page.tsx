"use client";

import { useState, useEffect } from "react";

type Supplier = {
  id: string;
  name: string;
  code: string;
  has_inspection_columns: boolean;
  lead_time_days: number;
  max_stone_count: number;
};

type Season = {
  id: string;
  name: string;
  year: number;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  name_en: string | null;
  category: string;
  material: string | null;
  stone_1: string | null;
  stone_2: string | null;
  stone_3: string | null;
  cost_price_inr: number | null;
  selling_price: number | null;
  size_options: string | null;
};

export default function OrderSheetPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [includeJpy, setIncludeJpy] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/suppliers").then((r) => r.json()),
      fetch("/api/seasons").then((r) => r.json()),
    ]).then(([s, sea]) => {
      setSuppliers(Array.isArray(s) ? s : []);
      setSeasons(Array.isArray(sea) ? sea : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedSupplierId) {
      setProducts([]);
      return;
    }
    setLoadingProducts(true);
    let url = `/api/products?supplier_id=${selectedSupplierId}&limit=500`;
    if (selectedSeasonId) {
      url += `&season_id=${selectedSeasonId}`;
    }
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : data.products || []);
        setLoadingProducts(false);
      });
  }, [selectedSupplierId, selectedSeasonId]);

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  function handleDownload() {
    if (!selectedSupplierId) return;
    let url = `/api/orders/export-excel?supplier_id=${selectedSupplierId}`;
    if (selectedSeasonId) url += `&season_id=${selectedSeasonId}`;
    if (includeJpy) url += `&include_jpy=true`;
    window.open(url, "_blank");
  }

  if (loading) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          発注シート出力
        </h1>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            発注シート確認・出力
          </h1>
          <p className="text-sm text-gray-500">
            メーカー別フォーマットでExcel出力
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メーカー
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
            >
              <option value="">メーカーを選択...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              シーズン（任意）
            </label>
            <select
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
            >
              <option value="">全商品</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              フォーマット
            </label>
            {selectedSupplier ? (
              <p className="text-sm text-gray-600 py-2">
                {selectedSupplier.has_inspection_columns
                  ? "検品管理列あり"
                  : "標準フォーマット"}
                {" / ストーン最大"}
                {selectedSupplier.max_stone_count}列
              </p>
            ) : (
              <p className="text-sm text-gray-400 py-2">
                メーカーを選択してください
              </p>
            )}
          </div>
        </div>
      </div>

      {selectedSupplierId && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
              <h3 className="font-medium text-sm text-gray-700">
                プレビュー（{products.length}件）
              </h3>
              {loadingProducts && (
                <span className="text-xs text-gray-400">読み込み中...</span>
              )}
            </div>
            {products.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="px-3 py-2 font-medium">No</th>
                      <th className="px-3 py-2 font-medium">商品CD</th>
                      <th className="px-3 py-2 font-medium">商品名</th>
                      <th className="px-3 py-2 font-medium">カテゴリ</th>
                      <th className="px-3 py-2 font-medium">素材</th>
                      <th className="px-3 py-2 font-medium">石1</th>
                      <th className="px-3 py-2 font-medium">石2</th>
                      <th className="px-3 py-2 font-medium text-right">
                        単価(INR)
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        販売価格
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.slice(0, 20).map((p, i) => (
                      <tr
                        key={p.id}
                        className="border-b border-gray-50 hover:bg-gray-50"
                      >
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 font-mono">{p.sku}</td>
                        <td className="px-3 py-2 text-gray-900">{p.name}</td>
                        <td className="px-3 py-2 text-gray-500">
                          {p.category}
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {p.material || "-"}
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {p.stone_1 || "-"}
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {p.stone_2 || "-"}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500">
                          {p.cost_price_inr
                            ? Number(p.cost_price_inr).toLocaleString()
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {p.selling_price
                            ? `¥${Number(p.selling_price).toLocaleString()}`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {products.length > 20 && (
                  <p className="px-3 py-2 text-xs text-gray-400 text-center">
                    他 {products.length - 20}件...
                  </p>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-gray-500">
                {loadingProducts
                  ? "読み込み中..."
                  : "該当する商品がありません"}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <h3 className="font-medium text-sm text-gray-700 mb-3">
              出力設定
            </h3>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={includeJpy}
                  onChange={(e) => setIncludeJpy(e.target.checked)}
                  className="rounded border-gray-300"
                />
                JPY換算値も併記
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleDownload}
              disabled={products.length === 0}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              Excel ダウンロード
            </button>
          </div>
        </>
      )}
    </div>
  );
}
