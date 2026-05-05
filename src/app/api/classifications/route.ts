import { NextRequest, NextResponse } from "next/server";
import { applyClassification } from "@/lib/classification";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      product_id: string;
      class_type: string;
      stage: string;
      reason?: string;
      classified_by?: string;
    };

    if (!body.product_id || !body.class_type || !body.stage) {
      return NextResponse.json(
        { error: "product_id, class_type, stage are required" },
        { status: 400 }
      );
    }

    const result = await applyClassification(
      body.product_id,
      body.class_type,
      body.stage,
      body.reason || "",
      body.classified_by || "system"
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
