import { NextResponse } from "next/server";
import { syncOpenLogiInventory } from "@/lib/openlogi";

export async function POST() {
  try {
    const result = await syncOpenLogiInventory();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
