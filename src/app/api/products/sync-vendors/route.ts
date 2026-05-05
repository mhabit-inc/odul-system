import { NextResponse } from "next/server";
import { syncVendorClassification } from "@/lib/sync-vendor-classification";

export async function POST() {
  try {
    const result = await syncVendorClassification();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
