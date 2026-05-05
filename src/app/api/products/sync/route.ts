import { NextResponse } from "next/server";
import { syncProducts } from "@/lib/sync-products";

export async function POST() {
  const apiKey = process.env.SYNC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "SYNC_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const result = await syncProducts();
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
