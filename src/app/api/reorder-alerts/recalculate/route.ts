import { NextResponse } from "next/server";
import { calculateReorderAlerts } from "@/lib/reorder-calc";

export async function POST() {
  try {
    const result = await calculateReorderAlerts();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
