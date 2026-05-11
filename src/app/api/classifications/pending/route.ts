import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: prelimProducts } = await supabase
      .from("products")
      .select("id, sku, name, name_en, category, launched_at, product_class")
      .in("product_class", ["未分類"])
      .lte("launched_at", sevenDaysAgo.toISOString().slice(0, 10))
      .order("launched_at", { ascending: false });

    const { data: confirmProducts } = await supabase
      .from("products")
      .select("id, sku, name, name_en, category, launched_at, product_class, product_class_stage")
      .eq("product_class_stage", "preliminary")
      .lte("launched_at", ninetyDaysAgo.toISOString().slice(0, 10))
      .order("launched_at", { ascending: false });

    const { data: allProducts } = await supabase
      .from("products")
      .select("product_class");

    const classes = (allProducts || []).map((p) => p.product_class);

    return NextResponse.json({
      pending_preliminary: prelimProducts || [],
      pending_confirmed: confirmProducts || [],
      summary: {
        total_products: classes.length,
        staple: classes.filter((c) => c === "定番").length,
        semi_staple: classes.filter((c) => c === "セミ定番").length,
        unclassified: classes.filter((c) => c === "未分類" || !c).length,
        pending_preliminary: (prelimProducts || []).length,
        pending_confirmed: (confirmProducts || []).length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
