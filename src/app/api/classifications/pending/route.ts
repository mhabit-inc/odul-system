import { NextResponse } from "next/server";
import { checkClassifications } from "@/lib/classification";

export async function GET() {
  try {
    const result = await checkClassifications();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
