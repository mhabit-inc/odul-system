"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";

type DefectiveItem = {
  id: string;
  inspection_id: string;
  reason: string;
  quantity: number;
  photo_urls: string[] | null;
  action: string | null;
  action_status: string;
  notes: string | null;
};

type InspectionDetail = {
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
};

const ACTIONS = ["返品", "交換依頼", "値引き処理", "廃棄", "修理"];
const ACTION_STATUSES = ["未対応", "対応中", "完了"];

export default function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [defectives, setDefectives] = useState<DefectiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/inspections`).then((r) => r.json()),
      fetch(`/api/defective-items?inspection_id=${id}`).then((r) => r.json()),
    ]).then(([inspections, defects]) => {
      const insp = (Array.isArray(inspections) ? inspections : []).find(
        (i: InspectionDetail) => i.id === id
      );
      setInspection(insp || null);
      setDefectives(Array.isArray(defects) ? defects : []);
      setLoading(false);
    });
  }, [id]);

  async function updateDefective(
    defectId: string,
    updates: Partial<DefectiveItem>
  ) {
    setUpdating(defectId);
    const res = await fetch("/api/defective-items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: defectId, ...updates }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDefectives((prev) =>
        prev.map((d) => (d.id === defectId ? { ...d, ...updated } : d))
      );
    }
    setUpdating(null);
  }

  async function handlePhotoUpload(
    defectId: string,
    file: File
  ) {
    setUploading(defectId);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "defective-photos");

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (res.ok) {
      const { url } = await res.json();
      const defect = defectives.find((d) => d.id === defectId);
      const currentUrls = defect?.photo_urls || [];
      await updateDefective(defectId, {
        photo_urls: [...currentUrls, url],
      });
    }
    setUploading(null);
  }

  function triggerFileInput(defectId: string) {
    setUploadTargetId(defectId);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && uploadTargetId) {
      handlePhotoUpload(uploadTargetId, file);
    }
    e.target.value = "";
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="max-w-4xl">
        <p className="text-gray-500">検品記録が見つかりません</p>
        <Link href="/inspections" className="text-sm text-blue-600 mt-2 block">
          ← 検品一覧
        </Link>
      </div>
    );
  }

  const defectRate =
    inspection.inspected_quantity > 0
      ? ((inspection.defective_quantity / inspection.inspected_quantity) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="max-w-4xl">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <Link href="/inspections" className="text-sm text-gray-400 hover:text-gray-600 mb-4 block">
        ← 検品一覧
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{inspection.products.name}</h1>
          <p className="text-sm text-gray-500 font-mono">{inspection.products.sku}</p>
        </div>
        <span className="text-sm text-gray-500">
          {new Date(inspection.inspected_at).toLocaleDateString("ja-JP")}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-lg font-bold text-gray-900">{inspection.inspected_quantity}</p>
          <p className="text-xs text-gray-400">検品数</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-lg font-bold text-green-600">{inspection.good_quantity}</p>
          <p className="text-xs text-gray-400">良品</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-lg font-bold text-red-600">{inspection.defective_quantity}</p>
          <p className="text-xs text-gray-400">不良品</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-lg font-bold text-orange-600">{inspection.missing_quantity}</p>
          <p className="text-xs text-gray-400">未着</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className={`text-lg font-bold ${Number(defectRate) > 5 ? "text-red-600" : "text-gray-900"}`}>
            {defectRate}%
          </p>
          <p className="text-xs text-gray-400">不良率</p>
        </div>
      </div>

      {inspection.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-yellow-800">{inspection.notes}</p>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900 mb-4">不良品詳細</h2>
      {defectives.length > 0 ? (
        <div className="space-y-4">
          {defectives.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                    {d.reason}
                  </span>
                  <span className="text-sm text-gray-600 ml-2">{d.quantity}個</span>
                </div>
                <ActionStatusBadge status={d.action_status} />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">アクション</label>
                  <select
                    value={d.action || ""}
                    onChange={(e) => updateDefective(d.id, { action: e.target.value || null })}
                    disabled={updating === d.id}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                  >
                    <option value="">未選択</option>
                    {ACTIONS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ステータス</label>
                  <select
                    value={d.action_status}
                    onChange={(e) => updateDefective(d.id, { action_status: e.target.value })}
                    disabled={updating === d.id}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                  >
                    {ACTION_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {d.notes && (
                <p className="text-sm text-gray-500 mb-3">{d.notes}</p>
              )}

              <div>
                <label className="block text-xs text-gray-500 mb-2">写真</label>
                <div className="flex gap-2 flex-wrap">
                  {(d.photo_urls || []).map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-20 h-20 rounded-lg border border-gray-200 overflow-hidden block"
                    >
                      <img src={url} alt={`不良品写真${i + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                  <button
                    onClick={() => triggerFileInput(d.id)}
                    disabled={uploading === d.id}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 disabled:opacity-50"
                  >
                    {uploading === d.id ? "..." : "+"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">不良品の記録はありません</p>
        </div>
      )}
    </div>
  );
}

function ActionStatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    未対応: "bg-red-50 text-red-700",
    対応中: "bg-yellow-50 text-yellow-700",
    完了: "bg-green-50 text-green-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config[status] || "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}
