"use client";

import { useState, useRef } from "react";

type ImportResult = {
  imported?: number;
  skipped?: number;
  errors?: string[];
  error?: string;
  foundHeaders?: string[];
};

export default function ImportPage() {
  const [type, setType] = useState<"sales" | "ad_costs">("sales");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const res = await fetch("/api/import", { method: "POST", body: formData });
    const data = await res.json();
    setResult(data);
    setUploading(false);
  }

  function reset() {
    setFile(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">データインポート</h1>
      <p className="text-sm text-gray-500 mb-6">売上データや広告費データをCSVファイルから取り込みます</p>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">インポートタイプ</label>
          <div className="flex gap-3">
            <button
              onClick={() => { setType("sales"); reset(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                type === "sales" ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600"
              }`}
            >
              売上データ
            </button>
            <button
              onClick={() => { setType("ad_costs"); reset(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                type === "ad_costs" ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600"
              }`}
            >
              広告費データ
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">CSVファイル</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-900 file:text-white hover:file:bg-gray-800"
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            {type === "sales" ? "売上CSV" : "広告費CSV"}の必須列
          </h3>
          {type === "sales" ? (
            <div className="text-xs text-gray-500 space-y-1">
              <p><span className="font-mono bg-gray-200 px-1 rounded">sku</span> または <span className="font-mono bg-gray-200 px-1 rounded">商品コード</span> — 商品SKU（必須）</p>
              <p><span className="font-mono bg-gray-200 px-1 rounded">quantity</span> または <span className="font-mono bg-gray-200 px-1 rounded">数量</span> — 販売数量（必須）</p>
              <p><span className="font-mono bg-gray-200 px-1 rounded">revenue</span> または <span className="font-mono bg-gray-200 px-1 rounded">売上</span> — 売上金額（必須）</p>
              <p><span className="font-mono bg-gray-200 px-1 rounded">date</span> または <span className="font-mono bg-gray-200 px-1 rounded">日付</span> — 販売日（任意）</p>
              <p><span className="font-mono bg-gray-200 px-1 rounded">channel</span> または <span className="font-mono bg-gray-200 px-1 rounded">チャネル</span> — 販売チャネル（任意、デフォルト: shopify）</p>
            </div>
          ) : (
            <div className="text-xs text-gray-500 space-y-1">
              <p><span className="font-mono bg-gray-200 px-1 rounded">date</span> または <span className="font-mono bg-gray-200 px-1 rounded">日付</span> — 日付（必須）</p>
              <p><span className="font-mono bg-gray-200 px-1 rounded">spend</span> または <span className="font-mono bg-gray-200 px-1 rounded">費用</span> — 広告費（必須）</p>
              <p><span className="font-mono bg-gray-200 px-1 rounded">channel</span> または <span className="font-mono bg-gray-200 px-1 rounded">媒体</span> — 広告チャネル（任意、デフォルト: meta）</p>
              <p><span className="font-mono bg-gray-200 px-1 rounded">impressions</span> または <span className="font-mono bg-gray-200 px-1 rounded">表示回数</span> — インプレッション数（任意）</p>
              <p><span className="font-mono bg-gray-200 px-1 rounded">clicks</span> または <span className="font-mono bg-gray-200 px-1 rounded">クリック数</span> — クリック数（任意）</p>
              <p><span className="font-mono bg-gray-200 px-1 rounded">conversions</span> または <span className="font-mono bg-gray-200 px-1 rounded">コンバージョン</span> — CV数（任意）</p>
              <p><span className="font-mono bg-gray-200 px-1 rounded">conversion_revenue</span> または <span className="font-mono bg-gray-200 px-1 rounded">CV売上</span> — CV売上（任意）</p>
            </div>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {uploading ? "インポート中..." : "インポート実行"}
        </button>
      </div>

      {result && (
        <div className={`mt-4 rounded-xl border p-4 ${
          result.error ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
        }`}>
          {result.error ? (
            <div>
              <p className="text-sm font-medium text-red-700">エラー: {result.error}</p>
              {result.foundHeaders && (
                <p className="text-xs text-red-500 mt-1">
                  検出された列: {result.foundHeaders.join(", ")}
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-green-700">
                {result.imported}件をインポートしました
              </p>
              {(result.skipped ?? 0) > 0 && (
                <p className="text-xs text-yellow-600 mt-1">
                  {result.skipped}件スキップ（SKU不一致）
                </p>
              )}
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  {result.errors.map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
