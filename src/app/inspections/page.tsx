"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Inspection = {
  id: string;
  order_id: string;
  product_id: string;
  inspected_quantity: number;
  good_quantity: number;
  defective_quantity: number;
  missing_quantity: number;
  notes: string | null;
  inspected_by: string | null;
  inspected_at: string;
  products: { name: string; sku: string };
  orders: { quantity: number; status: string };
};

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const fetchInspections = () => {
    fetch("/api/inspections")
      .then((r) => r.json())
      .then((data) => {
        setInspections(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">検品管理</h1>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">検品管理</h1>
          <p className="text-sm text-gray-500">
            {inspections.length}件の検品記録
          </p>
        </div>
        <div className="flex items-center gap-3">
          {importMsg && <span className="text-xs text-green-600">{importMsg}</span>}
          <label className={`px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer ${importing ? "opacity-50" : ""}`}>
            {importing ? "インポート中..." : "CSVインポート"}
            <input
              type="file"
              accept=".csv"
              className="hidden"
              disabled={importing}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImporting(true); setImportMsg("");
                const fd = new FormData();
                fd.append("file", file);
                const res = await fetch("/api/inspections/import-csv", { method: "POST", body: fd });
                const data = await res.json();
                setImportMsg(data.error ? `エラー: ${data.error}` : `${data.created}件インポート完了`);
                setImporting(false);
                e.target.value = "";
                fetchInspections();
              }}
            />
          </label>
          <Link
            href="/inspections/new"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            + 検品登録
          </Link>
        </div>
      </div>

      {inspections.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="px-4 py-3 font-medium">商品</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium text-right">検品数</th>
                <th className="px-4 py-3 font-medium text-right">良品</th>
                <th className="px-4 py-3 font-medium text-right">不良</th>
                <th className="px-4 py-3 font-medium text-right">未着</th>
                <th className="px-4 py-3 font-medium text-right">不良率</th>
                <th className="px-4 py-3 font-medium">検品日</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((ins) => {
                const defectRate =
                  ins.inspected_quantity > 0
                    ? (
                        (ins.defective_quantity / ins.inspected_quantity) *
                        100
                      ).toFixed(1)
                    : "0.0";
                return (
                  <tr
                    key={ins.id}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/inspections/${ins.id}`} className="hover:text-blue-600">
                        {ins.products.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {ins.products.sku}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {ins.inspected_quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {ins.good_quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {ins.defective_quantity > 0
                        ? ins.defective_quantity
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-orange-600">
                      {ins.missing_quantity > 0 ? ins.missing_quantity : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          Number(defectRate) > 5
                            ? "text-red-600 font-medium"
                            : "text-gray-500"
                        }
                      >
                        {defectRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(ins.inspected_at).toLocaleDateString("ja-JP")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">検品記録がありません。</p>
          <p className="text-sm text-gray-400 mt-1">
            入荷した発注の検品結果を登録しましょう。
          </p>
        </div>
      )}
    </div>
  );
}
