import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "receiving";
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");

  if (type === "products") {
    const { data: products } = await supabase
      .from("products")
      .select("sku, name, selling_price, category")
      .order("sku");

    if (!products || products.length === 0) {
      return NextResponse.json({ error: "no products" }, { status: 404 });
    }

    const header = "item_code,item_name,price,category\n";
    const rows = products
      .map(
        (p) =>
          `${csvEscape(p.sku)},${csvEscape(p.name)},${p.selling_price || ""},${csvEscape(p.category)}`
      )
      .join("\n");

    return new NextResponse(header + rows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="openlogi_products.csv"',
      },
    });
  }

  let query = supabase
    .from("inspections")
    .select("*, products(sku, name), orders(expected_delivery)")
    .order("inspected_at", { ascending: false });

  if (dateFrom) {
    query = query.gte("inspected_at", dateFrom);
  }
  if (dateTo) {
    query = query.lte("inspected_at", dateTo + "T23:59:59");
  }

  const { data: inspections } = await query;

  if (!inspections || inspections.length === 0) {
    return NextResponse.json(
      { error: "no inspections found" },
      { status: 404 }
    );
  }

  const header = "item_code,item_name,quantity,scheduled_date,warehouse_code\n";
  const rows = inspections
    .map((ins) => {
      const scheduledDate =
        (ins.orders as Record<string, unknown>)?.expected_delivery ||
        new Date().toISOString().slice(0, 10);
      return `${csvEscape((ins.products as Record<string, unknown>).sku as string)},${csvEscape((ins.products as Record<string, unknown>).name as string)},${ins.good_quantity},${scheduledDate},MAIN`;
    })
    .join("\n");

  return new NextResponse(header + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="openlogi_receiving.csv"',
    },
  });
}

function csvEscape(value: string): string {
  if (!value) return "";
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
