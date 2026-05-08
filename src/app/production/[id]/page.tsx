"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

type OrderDetail = {
  order: {
    id: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
    status: string;
    ordered_at: string;
    expected_delivery: string;
    actual_delivery: string;
    notes: string;
    created_at: string;
    products: {
      id: string;
      name: string;
      name_en: string;
      sku: string;
      category: string;
      selling_price: number;
    } | null;
    suppliers: { name: string; code: string } | null;
  };
  history: Array<{
    id: string;
    from_status: string;
    to_status: string;
    changed_by: string;
    comment: string;
    created_at: string;
  }>;
  comments: Array<{
    id: string;
    comment: string;
    created_by: string;
    created_at: string;
  }>;
};

const STATUS_FLOW = [
  "企画中", "発注準備", "発注済", "素材調達中", "製造中", "仕上げ",
  "品質検査", "出荷準備", "輸送中", "通関", "国内配送", "完了",
];

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = () => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    setSubmitting(true);
    await fetch(`/api/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchData();
    setSubmitting(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    await fetch(`/api/orders/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment: newComment }),
    });
    setNewComment("");
    fetchData();
    setSubmitting(false);
  };

  if (loading || !data) {
    return (
      <div className="max-w-4xl">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const o = data.order;
  const product = o.products;
  const currentIdx = STATUS_FLOW.indexOf(o.status);
  const nextStatus = currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;
  const isOverdue =
    o.expected_delivery &&
    new Date(o.expected_delivery) < new Date() &&
    !["国内配送", "完了"].includes(o.status);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/production" className="text-gray-400 hover:text-gray-600 text-sm">
          ← 生産管理
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {product?.name || product?.name_en || "不明"}
          </h1>
          <p className="text-sm text-gray-500 font-mono">{product?.sku}</p>
        </div>
        <StatusBadge status={o.status} large />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-0.5">
          {STATUS_FLOW.map((s, i) => {
            const isDone = i <= currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <div key={s} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center w-full">
                  <div
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-medium ${
                      isCurrent
                        ? "bg-gray-900 text-white"
                        : isDone
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isDone && !isCurrent ? "✓" : i + 1}
                  </div>
                  <span className={`mt-1 text-[10px] text-center leading-tight ${isCurrent ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                    {s}
                  </span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div className={`w-full h-0.5 -mt-4 ${isDone ? "bg-green-300" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {nextStatus && (
        <div className="mb-6">
          <button
            onClick={() => handleStatusChange(nextStatus)}
            disabled={submitting}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {nextStatus}に進める
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">発注情報</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">仕入先</dt>
              <dd className="text-gray-900">{o.suppliers?.name || "-"} ({o.suppliers?.code || "-"})</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">数量</dt>
              <dd className="text-gray-900">{o.quantity}個</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">単価</dt>
              <dd className="text-gray-900">¥{Number(o.unit_cost).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">合計</dt>
              <dd className="text-gray-900 font-medium">¥{Number(o.total_cost).toLocaleString()}</dd>
            </div>
          </dl>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">納期情報</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">発注日</dt>
              <dd className="text-gray-900">{o.ordered_at?.slice(0, 10) || "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">予定納期</dt>
              <dd className={isOverdue ? "text-red-600 font-medium" : "text-gray-900"}>
                {o.expected_delivery || "-"}
                {isOverdue && " (超過)"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">実納期</dt>
              <dd className="text-gray-900">{o.actual_delivery || "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">作成日</dt>
              <dd className="text-gray-900">{o.created_at?.slice(0, 10)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {o.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-yellow-800">{o.notes}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">ステータス履歴</h3>
          {data.history.length > 0 ? (
            <div className="space-y-3">
              {data.history.map((h) => (
                <div key={h.id} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      {h.from_status && (
                        <>
                          <span className="text-gray-500">{h.from_status}</span>
                          <span className="text-gray-400">→</span>
                        </>
                      )}
                      <span className="font-medium text-gray-900">{h.to_status}</span>
                    </div>
                    <p className="text-gray-400 mt-0.5">
                      {h.changed_by} · {new Date(h.created_at).toLocaleString("ja-JP")}
                    </p>
                    {h.comment && <p className="text-gray-500 mt-0.5">{h.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">履歴なし</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">コメント</h3>
          <div className="mb-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="コメントを入力..."
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
              />
              <button
                onClick={handleAddComment}
                disabled={submitting || !newComment.trim()}
                className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm disabled:opacity-50"
              >
                送信
              </button>
            </div>
          </div>
          {data.comments.length > 0 ? (
            <div className="space-y-3">
              {data.comments.map((c) => (
                <div key={c.id} className="border-b border-gray-50 pb-2">
                  <p className="text-sm text-gray-900">{c.comment}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {c.created_by} · {new Date(c.created_at).toLocaleString("ja-JP")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">コメントなし</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, large }: { status: string; large?: boolean }) {
  const config: Record<string, string> = {
    企画中: "bg-slate-50 text-slate-600",
    発注準備: "bg-gray-100 text-gray-600",
    発注済: "bg-blue-50 text-blue-700",
    素材調達中: "bg-cyan-50 text-cyan-700",
    製造中: "bg-yellow-50 text-yellow-700",
    仕上げ: "bg-amber-50 text-amber-700",
    品質検査: "bg-orange-50 text-orange-700",
    出荷準備: "bg-indigo-50 text-indigo-700",
    輸送中: "bg-purple-50 text-purple-700",
    通関: "bg-pink-50 text-pink-700",
    国内配送: "bg-green-50 text-green-700",
    完了: "bg-green-100 text-green-800",
  };
  return (
    <span
      className={`inline-block rounded font-medium ${config[status] || "bg-gray-100 text-gray-500"} ${
        large ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs"
      }`}
    >
      {status}
    </span>
  );
}
