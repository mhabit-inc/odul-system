import { NextResponse } from "next/server";
import { syncVendorClassification } from "@/lib/sync-vendor-classification";
import { syncShopifyInventory } from "@/lib/sync-shopify-inventory";
import { calculateReorderAlerts } from "@/lib/reorder-calc";

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

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    results,
  });
}
