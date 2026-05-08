"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Product = {
  id: string;
  name: string;
  name_en: string;
  sku: string;
  category: string;
  product_class: string;
  current_stock: number;
  selling_price: number;
  cost_price_jpy: number;
};

type Summary = {
  totalProducts: number;
  totalStock: number;
  totalValue: number;
  zeroStock: number;
  lowStock: number;
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockFilter, setStockFilter] = useState<string>("");
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");

  const fetchData = (filter?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set("stock", filter);
    fetch(`/api/inventory?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products || []);
        setSummary(d.summary);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData(stockFilter);
  }, [stockFilter]);

  const handleAdjust = async (productId: string) => {
    if (adjustQty === 0) return;
    await fetch("/api/inventory/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        quantity_change: adjustQty,
        reason: adjustReason || "手動調整",
      }),
    });
    setAdjusting(null);
    setAdjustQty(0);
    setAdjustReason("");
    fetchData(stockFilter);
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">在庫管理</h1>
          <p className="text-sm text-gray-500">在庫状況の確認と調整</p>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-lg font-bold text-gray-900">
              {summary.totalStock.toLocaleString()}個
            </p>
            <p className="text-xs text-gray-400">総在庫数</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-lg font-bold text-gray-900">
              ¥{summary.totalValue.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">在庫金額</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <p className="text-lg font-bold text-gray-900">
              {summary.totalProducts}
            </p>
            <p className="text-xs text-gray-400">SKU数</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-lg font-bold text-red-600">
              {summary.zeroStock}
            </p>
            <p className="text-xs text-red-500">在庫切れ</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <p className="text-lg font-bold text-yellow-600">
              {summary.lowStock}
            </p>
            <p className="text-xs text-yellow-500">在庫少(5個以下)</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {[
          { value: "", label: "すべて" },
          { value: "zero", label: "在庫切れ" },
          { value: "low", label: "在庫少" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setStockFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              stockFilter === f.value
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : products.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">商品名</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">カテゴリー</th>
                <th className="px-4 py-3 font-medium text-right">在庫数</th>
                <th className="px-4 py-3 font-medium text-right">在庫金額</th>
                <th className="px-4 py-3 font-medium text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const stockValue =
                  (p.current_stock || 0) *
                  Number(p.cost_price_jpy || p.selling_price || 0);
                return (
                  <tr
                    key={p.id}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/products/${p.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {p.name || p.name_en || "-"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {p.sku}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.category || "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-medium ${
                          (p.current_stock || 0) === 0
                            ? "text-red-600"
                            : (p.current_stock || 0) <= 5
                              ? "text-yellow-600"
                              : "text-gray-900"
                        }`}
                      >
                        {p.current_stock ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      ¥{stockValue.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {adjusting === p.id ? (
                        <div className="flex items-center gap-2 justify-center">
                          <input
                            type="number"
                            value={adjustQty}
                            onChange={(e) =>
                              setAdjustQty(parseInt(e.target.value) || 0)
                            }
                            className="w-16 px-2 py-1 border rounded text-xs text-center"
                            placeholder="±数量"
                          />
                          <input
                            type="text"
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            className="w-24 px-2 py-1 border rounded text-xs"
                            placeholder="理由"
                          />
                          <button
                            onClick={() => handleAdjust(p.id)}
                            className="px-2 py-1 bg-gray-900 text-white rounded text-xs"
                          >
                            確定
                          </button>
                          <button
                            onClick={() => {
                              setAdjusting(null);
                              setAdjustQty(0);
                              setAdjustReason("");
                            }}
                            className="px-2 py-1 border rounded text-xs text-gray-500"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAdjusting(p.id)}
                          className="px-3 py-1 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50"
                        >
                          調整
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">該当する商品がありません</p>
        </div>
      )}
    </div>
  );
}
