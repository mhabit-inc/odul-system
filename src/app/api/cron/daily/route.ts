import { NextResponse } from "next/server";
import { calculateReorderAlerts } from "@/lib/reorder-calc";
import { syncOpenLogiInventory } from "@/lib/openlogi";
import { supabase } from "@/lib/supabase";
import { deadlineReminderNotification } from "@/lib/slack";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: Record<string, string> = {};

  try {
    const syncResult = await syncOpenLogiInventory();
    results.openlogiSync = `${syncResult.updated}件更新`;
  } catch (e) {
    results.openlogiSync = `error: ${e}`;
  }

  try {
    await calculateReorderAlerts();
    results.reorderAlerts = "ok";
  } catch (e) {
    results.reorderAlerts = `error: ${e}`;
  }

  try {
    const now = new Date();
    const threeDaysAhead = new Date(now);
    threeDaysAhead.setDate(threeDaysAhead.getDate() + 3);

    const { data: urgentOrders } = await supabase
      .from("orders")
      .select("*, products(name, name_en, sku), suppliers(name)")
      .not("status", "in", '("完了","国内配送")')
      .lte("expected_delivery", threeDaysAhead.toISOString().slice(0, 10))
      .gte("expected_delivery", now.toISOString().slice(0, 10));

    if (urgentOrders && urgentOrders.length > 0) {
      await deadlineReminderNotification(
        urgentOrders.map((o) => {
          const prod = (o as Record<string, unknown>).products as Record<string, string> | null;
          const sup = (o as Record<string, unknown>).suppliers as Record<string, string> | null;
          const daysUntil = Math.ceil(
            (new Date(o.expected_delivery).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
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
    results.urgentDeadlines = "ok";
  } catch (e) {
    results.urgentDeadlines = `error: ${e}`;
  }

  try {
    const { data: overdueOrders } = await supabase
      .from("orders")
      .select("id, status, expected_delivery")
      .not("status", "in", '("完了","国内配送")')
      .lt("expected_delivery", new Date().toISOString().slice(0, 10));

    results.overdueCount = `${overdueOrders?.length || 0}件`;
  } catch (e) {
    results.overdueCheck = `error: ${e}`;
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    type: "daily",
    results,
  });
}
