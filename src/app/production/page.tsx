"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Order = {
  id: string;
  product_id: string;
  supplier_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  status: string;
  ordered_at: string | null;
  expected_delivery: string | null;
  actual_delivery: string | null;
  notes: string | null;
  created_at: string;
  products: { name: string; name_en: string | null; sku: string; category: string };
  suppliers: { name: string; code: string };
};

const STATUSES = [
  "発注準備",
  "発注済",
  "製造中",
  "出荷済",
  "入荷済",
  "検品済",
];

const STATUS_COLORS: Record<string, string> = {
  "発注準備": "bg-gray-100 border-gray-300",
  "発注済": "bg-blue-50 border-blue-200",
  "製造中": "bg-yellow-50 border-yellow-200",
  "出荷済": "bg-purple-50 border-purple-200",
  "入荷済": "bg-green-50 border-green-200",
  "検品済": "bg-emerald-50 border-emerald-200",
};

export default function ProductionPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "timeline">("kanban");
  const [supplierFilter, setSupplierFilter] = useState("");

  const fetchOrders = useCallback(async () => {
    let url = "/api/orders";
    if (supplierFilter) url += `?supplier_id=${supplierFilter}`;
    const res = await fetch(url);
    const data = await res.json();
    setOrders(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [supplierFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function moveStatus(orderId: string, newStatus: string) {
    setUpdatingId(orderId);
    await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await fetchOrders();
    setUpdatingId(null);
  }

  function getDaysUntilDelivery(date: string | null): number | null {
    if (!date) return null;
    const diff = new Date(date).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  const suppliers = [...new Set(orders.map((o) => JSON.stringify({ id: o.supplier_id, name: o.suppliers.name })))].map(
    (s) => JSON.parse(s) as { id: string; name: string }
  );

  const statusCounts = STATUSES.reduce(
    (acc, s) => {
      acc[s] = orders.filter((o) => o.status === s).length;
      return acc;
    },
    {} as Record<string, number>
  );

  if (loading) {
    return (
      <div className="max-w-7xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          生産管理ダッシュボード
        </h1>
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            生産管理ダッシュボード
          </h1>
          <p className="text-sm text-gray-500">{orders.length}件の発注</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
          >
            <option value="">全メーカー</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 text-sm ${view === "kanban" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              カンバン
            </button>
            <button
              onClick={() => setView("timeline")}
              className={`px-3 py-1.5 text-sm ${view === "timeline" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              タイムライン
            </button>
          </div>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUSES.map((status) => (
            <div key={status} className="flex-shrink-0 w-56">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-gray-700">
                  {status}
                </h3>
                <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {statusCounts[status]}
                </span>
              </div>
              <div className="space-y-2">
                {orders
                  .filter((o) => o.status === status)
                  .map((order) => {
                    const days = getDaysUntilDelivery(order.expected_delivery);
                    const isOverdue = days !== null && days < 0;
                    const isUrgent = days !== null && days >= 0 && days <= 7;
                    const statusIdx = STATUSES.indexOf(status);
                    const nextStatus =
                      statusIdx < STATUSES.length - 1
                        ? STATUSES[statusIdx + 1]
                        : null;

                    return (
                      <div
                        key={order.id}
                        className={`rounded-lg border p-3 ${STATUS_COLORS[status]}`}
                      >
                        <div className="font-medium text-sm text-gray-900 mb-1">
                          {order.products.name || order.products.name_en}
                        </div>
                        <div className="text-xs text-gray-500 mb-1">
                          {order.suppliers.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.quantity}個
                        </div>
                        {order.expected_delivery && (
                          <div
                            className={`text-xs mt-1 ${isOverdue ? "text-red-600 font-medium" : isUrgent ? "text-orange-600 font-medium" : "text-gray-400"}`}
                          >
                            {isOverdue
                              ? `遅延 ${Math.abs(days!)}日`
                              : `納期: ${order.expected_delivery}${isUrgent ? ` (残${days}日)` : ""}`}
                          </div>
                        )}
                        {nextStatus && (
                          <button
                            onClick={() => moveStatus(order.id, nextStatus)}
                            disabled={updatingId === order.id}
                            className="mt-2 w-full text-xs px-2 py-1 bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {updatingId === order.id
                              ? "..."
                              : `→ ${nextStatus}`}
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <TimelineView orders={orders} />
      )}
    </div>
  );
}

function TimelineView({ orders }: { orders: Order[] }) {
  const activeOrders = orders.filter(
    (o) => o.status !== "検品済" && o.ordered_at
  );

  if (activeOrders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">
          進行中の発注がありません。
        </p>
      </div>
    );
  }

  const today = new Date();
  const dates = activeOrders.flatMap((o) =>
    [o.ordered_at, o.expected_delivery].filter(Boolean).map((d) => new Date(d!))
  );
  dates.push(today);
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(
    Math.max(...dates.map((d) => d.getTime())) + 30 * 24 * 60 * 60 * 1000
  );
  const totalDays =
    (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);

  function getPosition(dateStr: string): number {
    const d = new Date(dateStr);
    return (
      ((d.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) *
      100
    );
  }

  const months: { label: string; pos: number }[] = [];
  const d = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (d <= maxDate) {
    months.push({
      label: `${d.getMonth() + 1}月`,
      pos: getPosition(d.toISOString().slice(0, 10)),
    });
    d.setMonth(d.getMonth() + 1);
  }

  const todayPos = getPosition(today.toISOString().slice(0, 10));

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="relative h-8 border-b bg-gray-50">
        {months.map((m, i) => (
          <div
            key={i}
            className="absolute text-xs text-gray-500 font-medium"
            style={{ left: `${Math.max(0, m.pos)}%`, top: "8px" }}
          >
            {m.label}
          </div>
        ))}
        <div
          className="absolute top-0 bottom-0 w-px bg-red-400"
          style={{ left: `${todayPos}%` }}
        />
      </div>

      {activeOrders.map((order) => {
        const startPos = order.ordered_at ? getPosition(order.ordered_at) : 0;
        const endPos = order.expected_delivery
          ? getPosition(order.expected_delivery)
          : startPos + 10;
        const width = Math.max(2, endPos - startPos);
        const isOverdue =
          order.expected_delivery &&
          new Date(order.expected_delivery) < today &&
          order.status !== "入荷済" &&
          order.status !== "検品済";

        return (
          <div key={order.id} className="relative h-10 border-b border-gray-50">
            <div
              className="absolute top-0 bottom-0 w-px bg-red-400 opacity-30"
              style={{ left: `${todayPos}%` }}
            />
            <div className="absolute left-2 top-2 text-xs text-gray-600 w-32 truncate z-10">
              {order.products.name || order.products.sku}
            </div>
            <div
              className={`absolute top-2 h-6 rounded ${isOverdue ? "bg-red-200" : "bg-blue-200"}`}
              style={{
                left: `${Math.max(0, startPos)}%`,
                width: `${width}%`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
