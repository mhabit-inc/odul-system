import { NextRequest, NextResponse } from "next/server";
import { syncShopifyOrders } from "@/lib/shopify";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sinceDate = (body as { since_date?: string }).since_date;
    const result = await syncShopifyOrders(sinceDate);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
