"use client";

import { useState } from "react";

export default function OpenLogiExportPage() {
  const [csvType, setCsvType] = useState<"receiving" | "products">("receiving");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState(
    new Date().toISOString().slice(0, 10)
  );

  function handleDownload() {
    let url = `/api/openlogi/export?type=${csvType}`;
    if (csvType === "receiving") {
      if (dateFrom) url += `&date_from=${dateFrom}`;
      if (dateTo) url += `&date_to=${dateTo}`;
    }
    window.open(url, "_blank");
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          OpenLogi CSV出力
        </h1>
        <p className="text-sm text-gray-500">
          OpenLogiへ送るCSVファイルを生成
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CSV種別
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="type"
                checked={csvType === "receiving"}
                onChange={() => setCsvType("receiving")}
                className="text-gray-900"
              />
              入荷予定CSV
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="type"
                checked={csvType === "products"}
                onChange={() => setCsvType("products")}
                className="text-gray-900"
              />
              商品マスタCSV
            </label>
          </div>
        </div>

        {csvType === "receiving" && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                検品日 From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                検品日 To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-500">
            {csvType === "receiving" ? (
              <>
                入荷予定CSV: 検品完了した商品の良品数をOpenLogiに通知するCSV。
                <br />
                カラム: item_code, item_name, quantity, scheduled_date,
                warehouse_code
              </>
            ) : (
              <>
                商品マスタCSV: OpenLogiに商品を登録するためのCSV。
                <br />
                カラム: item_code, item_name, price, category
              </>
            )}
          </p>
        </div>

        <button
          onClick={handleDownload}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          CSVダウンロード
        </button>
      </div>
    </div>
  );
}
