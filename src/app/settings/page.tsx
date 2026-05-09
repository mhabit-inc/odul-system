"use client";

import { useState } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<Record<string, string> | null>(null);
  const [recalcing, setRecalcing] = useState(false);
  const [recalcResult, setRecalcResult] = useState<string>("");
  const [sheetSyncing, setSheetSyncing] = useState(false);
  const [sheetResult, setSheetResult] = useState<string>("");

  async function handleSeed() {
    const secret = prompt("CRON_SECRETを入力してください");
    if (!secret) return;
    setSeeding(true);
    setSeedResult(null);
    const res = await fetch("/api/seed", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    const data = await res.json();
    setSeedResult(data.results || { error: data.error });
    setSeeding(false);
  }

  async function handleRecalc() {
    setRecalcing(true);
    setRecalcResult("");
    const res = await fetch("/api/reorder-alerts/recalculate", { method: "POST" });
    const data = await res.json();
    setRecalcResult(
      data.error
        ? `エラー: ${data.error}`
        : `計算完了: ${data.calculated}件 (C:${data.critical} W:${data.warning} S:${data.safe})`
    );
    setRecalcing(false);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">設定</h1>

      <div className="space-y-4">
        <Link
          href="/settings/thresholds"
          className="block bg-white rounded-xl border border-gray-200 p-5 hover:bg-gray-50"
        >
          <h2 className="text-base font-semibold text-gray-900">分類閾値設定</h2>
          <p className="text-sm text-gray-500 mt-1">定番・アーカイブの自動判定閾値を調整</p>
        </Link>

        <Link
          href="/settings/multipliers"
          className="block bg-white rounded-xl border border-gray-200 p-5 hover:bg-gray-50"
        >
          <h2 className="text-base font-semibold text-gray-900">再販倍率ルール</h2>
          <p className="text-sm text-gray-500 mt-1">セミ定番の売上消化率に応じた再発注倍率を編集</p>
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-2">リオーダーアラート再計算</h2>
          <p className="text-sm text-gray-500 mb-3">
            売上データと在庫から、全商品のリオーダーアラートを再計算します
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRecalc}
              disabled={recalcing}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {recalcing ? "計算中..." : "再計算"}
            </button>
            {recalcResult && <span className="text-sm text-green-600">{recalcResult}</span>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Google Sheets同期</h2>
          <p className="text-sm text-gray-500 mb-3">
            商品マスタスプレッドシートからデータを同期します
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                setSheetSyncing(true); setSheetResult("");
                const res = await fetch("/api/sync-sheets", { method: "POST" });
                const data = await res.json();
                setSheetResult(
                  data.error
                    ? `エラー: ${data.error}`
                    : `同期完了: ${data.synced}件 (新規${data.created} / 更新${data.updated})`
                );
                setSheetSyncing(false);
              }}
              disabled={sheetSyncing}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {sheetSyncing ? "同期中..." : "スプレッドシート同期"}
            </button>
            {sheetResult && <span className="text-sm text-green-600">{sheetResult}</span>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-2">サンプルデータ投入</h2>
          <p className="text-sm text-gray-500 mb-3">
            テスト用のサンプルデータ（商品30件、売上180件、発注10件等）を投入します。
            既存のSKUがある場合は上書きされます。
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
          >
            {seeding ? "投入中..." : "サンプルデータを投入"}
          </button>
          {seedResult && (
            <div className="mt-3 bg-gray-50 rounded-lg p-3 text-xs">
              {Object.entries(seedResult).map(([k, v]) => (
                <p key={k}><span className="text-gray-500">{k}:</span> <span className="font-medium">{v}</span></p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
