import { NextResponse } from "next/server";
import { syncVendorClassification } from "@/lib/sync-vendor-classification";
import { syncShopifyInventory } from "@/lib/sync-shopify-inventory";
import { calculateReorderAlerts } from "@/lib/reorder-calc";
import { supabase } from "@/lib/supabase";
import {
  deadlineReminderNotification,
  weeklySummaryNotification,
} from "@/lib/slack";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: Record<string, string> = {};

  try {
    await syncVendorClassification();
    results.vendorSync = "ok";
  } catch (e) {
    results.vendorSync = `error: ${e}`;
  }

  try {
    await syncShopifyInventory();
    results.inventorySync = "ok";
  } catch (e) {
    results.inventorySync = `error: ${e}`;
  }

  try {
    await calculateReorderAlerts();
    results.reorderAlerts = "ok";
  } catch (e) {
    results.reorderAlerts = `error: ${e}`;
  }

  try {
    const now = new Date();
    const weekAhead = new Date(now);
    weekAhead.setDate(weekAhead.getDate() + 7);

    const { data: upcomingOrders } = await supabase
      .from("orders")
      .select("*, products(name, name_en, sku), suppliers(name)")
      .in("status", ["発注済", "製造中", "出荷済"])
      .lte("expected_delivery", weekAhead.toISOString().slice(0, 10))
      .gte("expected_delivery", now.toISOString().slice(0, 10));

    if (upcomingOrders && upcomingOrders.length > 0) {
      await deadlineReminderNotification(
        upcomingOrders.map((o) => {
          const prod = (o as Record<string, unknown>).products as Record<string, string> | null;
          const sup = (o as Record<string, unknown>).suppliers as Record<string, string> | null;
          const daysUntil = Math.ceil(
            (new Date(o.expected_delivery).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24)
          );
          return {
            productName: prod?.name || prod?.name_en || "不明",
            sku: prod?.sku || "",
            expectedDelivery: o.expected_delivery,
            daysUntil,
            supplierName: sup?.name || "不明",
          };
        })
      );
    }
    results.deadlineReminder = "ok";
  } catch (e) {
    results.deadlineReminder = `error: ${e}`;
  }

  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString();

    const [salesRes, alertsRes, ordersRes] = await Promise.all([
      supabase
        .from("sales")
        .select("revenue, quantity")
        .gte("sold_at", weekAgoStr),
      supabase.from("reorder_alerts").select("alert_level"),
      supabase
        .from("orders")
        .select("status, expected_delivery")
        .in("status", ["発注済", "製造中", "出荷済"]),
    ]);

    const sales = salesRes.data || [];
    const alerts = alertsRes.data || [];
    const orders = ordersRes.data || [];

    const now = new Date();
    await weeklySummaryNotification({
      totalRevenue: sales.reduce((s, r) => s + Number(r.revenue || 0), 0),
      totalQuantity: sales.reduce((s, r) => s + (r.quantity || 0), 0),
      criticalAlerts: alerts.filter((a) => a.alert_level === "critical").length,
      warningAlerts: alerts.filter((a) => a.alert_level === "warning").length,
      pendingOrders: orders.length,
      overdueOrders: orders.filter(
        (o) =>
          o.expected_delivery && new Date(o.expected_delivery) < now
      ).length,
    });
    results.weeklySummary = "ok";
  } catch (e) {
    results.weeklySummary = `error: ${e}`;
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    results,
  });
}
