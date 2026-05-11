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

type Transaction = {
  id: string;
  product_id: string;
  type: string;
  quantity: number;
  reason: string;
  created_by: string;
  created_at: string;
  products: { name: string; name_en: string; sku: string } | null;
};

type Summary = {
  totalProducts: number;
  totalStock: number;
  totalValue: number;
  zeroStock: number;
  lowStock: number;
};

type SortKey = "name" | "sku" | "stock" | "value" | "category";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockFilter, setStockFilter] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [tab, setTab] = useState<"stock" | "history">("stock");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

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

  useEffect(() => {
    if (tab === "history" && transactions.length === 0) {
      setTxLoading(true);
      fetch("/api/inventory/transactions")
        .then((r) => r.json())
        .then((d) => {
          setTransactions(Array.isArray(d) ? d : []);
          setTxLoading(false);
        });
    }
  }, [tab]);

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

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "name" || key === "sku" || key === "category");
    }
  }

  const filteredProducts = products
    .filter((p) => {
      if (classFilter && p.product_class !== classFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          (p.name || "").toLowerCase().includes(q) ||
          (p.name_en || "").toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      switch (sortKey) {
        case "name":
          return dir * (a.name || a.name_en || "").localeCompare(b.name || b.name_en || "");
        case "sku":
          return dir * a.sku.localeCompare(b.sku);
        case "category":
          return dir * (a.category || "").localeCompare(b.category || "");
        case "stock":
          return dir * ((a.current_stock || 0) - (b.current_stock || 0));
        case "value": {
          const va = (a.current_stock || 0) * Number(a.cost_price_jpy || a.selling_price || 0);
          const vb = (b.current_stock || 0) * Number(b.cost_price_jpy || b.selling_price || 0);
          return dir * (va - vb);
        }
        default:
          return 0;
      }
    });

  const SortHeader = ({ label, field, align }: { label: string; field: SortKey; align?: string }) => (
    <th
      className={`px-4 py-3 font-medium cursor-pointer hover:text-gray-700 select-none ${align || ""}`}
      onClick={() => handleSort(field)}
    >
      {label} {sortKey === field ? (sortAsc ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">在庫管理</h1>
          <p className="text-sm text-gray-500">在庫状況の確認と調整</p>
        </div>
        <div className="flex items-center gap-3">
          {syncMsg && <span className="text-xs text-green-600">{syncMsg}</span>}
          <button
            onClick={async () => {
              setSyncing(true); setSyncMsg("");
              const res = await fetch("/api/inventory/sync-openlogi", { method: "POST" });
              const data = await res.json();
              setSyncMsg(data.error ? `エラー: ${data.error}` : `${data.updated}件同期完了`);
              setSyncing(false);
              fetchData(stockFilter);
            }}
            disabled={syncing}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {syncing ? "同期中..." : "OpenLogi同期"}
          </button>
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

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden mr-4">
          <button
            onClick={() => setTab("stock")}
            className={`px-3 py-1.5 text-sm ${tab === "stock" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            在庫一覧
          </button>
          <button
            onClick={() => setTab("history")}
            className={`px-3 py-1.5 text-sm ${tab === "history" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            取引履歴
          </button>
        </div>
        {tab === "stock" && (
          <>
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
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white"
            >
              <option value="">分類: すべて</option>
              {["定番", "セミ定番", "新作", "アーカイブ", "ノベルティ", "未分類"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="商品名・SKU検索..."
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm w-48"
            />
          </>
        )}
      </div>

      {tab === "stock" ? (
        loading ? (
          <p className="text-gray-500">読み込み中...</p>
        ) : filteredProducts.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b bg-gray-50">
                  <SortHeader label="商品名" field="name" />
                  <SortHeader label="SKU" field="sku" />
                  <SortHeader label="カテゴリー" field="category" />
                  <SortHeader label="在庫数" field="stock" align="text-right" />
                  <SortHeader label="在庫金額" field="value" align="text-right" />
                  <th className="px-4 py-3 font-medium text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const stockValue =
                    (p.current_stock || 0) *
                    Number(p.cost_price_jpy || p.selling_price || 0);
                  const isNegative = (p.current_stock || 0) < 0;
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
                            isNegative
                              ? "text-red-600"
                              : (p.current_stock || 0) === 0
                                ? "text-red-600"
                                : (p.current_stock || 0) <= 5
                                  ? "text-yellow-600"
                                  : "text-gray-900"
                          }`}
                        >
                          {p.current_stock ?? 0}
                        </span>
                        {isNegative && (
                          <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-medium rounded">
                            要確認
                          </span>
                        )}
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
        )
      ) : txLoading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : transactions.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">日時</th>
                <th className="px-4 py-3 font-medium">商品</th>
                <th className="px-4 py-3 font-medium">種別</th>
                <th className="px-4 py-3 font-medium text-right">数量</th>
                <th className="px-4 py-3 font-medium">理由</th>
                <th className="px-4 py-3 font-medium">実行者</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const typeLabels: Record<string, { label: string; color: string }> = {
                  inspection_good: { label: "検品入庫", color: "text-green-600" },
                  adjustment_in: { label: "手動入庫", color: "text-blue-600" },
                  adjustment_out: { label: "手動出庫", color: "text-red-600" },
                  sale: { label: "販売", color: "text-gray-600" },
                };
                const typeInfo = typeLabels[tx.type] || { label: tx.type, color: "text-gray-600" };
                return (
                  <tr key={tx.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-3">
                      {tx.products ? (
                        <Link href={`/products/${tx.product_id}`} className="text-gray-900 hover:text-blue-600">
                          {tx.products.name || tx.products.name_en}
                        </Link>
                      ) : "-"}
                    </td>
                    <td className={`px-4 py-3 text-xs font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {tx.type.includes("out") || tx.type === "sale" ? `-${tx.quantity}` : `+${tx.quantity}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{tx.reason || "-"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{tx.created_by || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">取引履歴がありません</p>
        </div>
      )}
    </div>
  );
}
