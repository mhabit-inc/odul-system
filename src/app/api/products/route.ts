import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const productClass = searchParams.get("class");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const supplierId = searchParams.get("supplier_id");
  const seasonId = searchParams.get("season_id");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (productClass) {
    query = query.eq("product_class", productClass);
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
  }
  if (supplierId) {
    query = query.eq("supplier_id", supplierId);
  }
  if (seasonId) {
    query = query.eq("season_id", seasonId);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    products: data,
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
    },
  });
}
