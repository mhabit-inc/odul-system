import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results: Record<string, string> = {};

  // 1. Suppliers
  const suppliers = [
    { name: "Jaipur Gems", code: "JG", lead_time_days: 105, contact_info: "Rajasthan, India" },
    { name: "Mumbai Silver Works", code: "MSW", lead_time_days: 90, contact_info: "Mumbai, India" },
    { name: "Delhi Craft House", code: "DCH", lead_time_days: 120, contact_info: "New Delhi, India" },
  ];
  const { data: suppData } = await supabase.from("suppliers").upsert(suppliers, { onConflict: "code" }).select();
  results.suppliers = `${suppData?.length || 0}件`;

  const supplierMap = new Map((suppData || []).map((s) => [s.code, s.id]));

  // 2. Seasons
  const seasons = [
    { name: "Spring", year: 2026, start_date: "2026-03-01", end_date: "2026-05-31" },
    { name: "Summer", year: 2026, start_date: "2026-06-01", end_date: "2026-08-31" },
    { name: "Autumn", year: 2026, start_date: "2026-09-01", end_date: "2026-11-30" },
  ];
  const { data: seasonData } = await supabase.from("seasons").upsert(seasons, { onConflict: "name,year" }).select();
  results.seasons = `${seasonData?.length || 0}件`;

  // 3. Products
  const categories = ["ネックレス", "リング", "ブレスレット", "イヤリング", "チャーム"];
  const materials = ["シルバー925", "K10", "K14GF", "真鍮"];
  const stones = ["ラブラドライト", "ムーンストーン", "ガーネット", "トルマリン", "アメジスト", "ペリドット", null];
  const classes = ["定番", "セミ定番", "新作", "新作", "セミ定番"];

  const products = [];
  for (let i = 1; i <= 30; i++) {
    const cat = categories[i % categories.length];
    const mat = materials[i % materials.length];
    const cls = classes[i % classes.length];
    const price = [8800, 11000, 13200, 15400, 19800, 24200][i % 6];
    const costInr = Math.round(price * 0.12 * (0.8 + Math.random() * 0.4));
    const supplierCode = ["JG", "MSW", "DCH"][i % 3];

    products.push({
      sku: `ODL-${String(i).padStart(3, "0")}`,
      name: `${mat} ${stones[i % stones.length] || ""} ${cat}`.trim(),
      name_en: `${mat} ${cat} #${i}`,
      category: cat,
      material: mat,
      stone_1: stones[i % stones.length],
      cost_price_inr: costInr,
      exchange_rate: 1.85,
      cost_price_jpy: Math.round(costInr * 1.85),
      selling_price: price,
      supplier_id: supplierMap.get(supplierCode),
      product_class: cls,
      product_class_stage: cls === "定番" || cls === "セミ定番" ? "confirmed" : "preliminary",
      launched_at: `2025-${String((i % 12) + 1).padStart(2, "0")}-15`,
      current_stock: Math.floor(Math.random() * 30) + (cls === "定番" ? 10 : 2),
    });
  }

  const { data: prodData } = await supabase.from("products").upsert(products, { onConflict: "sku" }).select();
  results.products = `${prodData?.length || 0}件`;

  const productIds = (prodData || []).map((p) => p.id);

  // 4. Sales (past 6 months)
  const salesRows = [];
  const now = new Date();
  for (const pid of productIds) {
    const prod = (prodData || []).find((p) => p.id === pid);
    if (!prod) continue;
    const monthlyRate = prod.product_class === "定番" ? 8 : prod.product_class === "セミ定番" ? 4 : 2;

    for (let m = 0; m < 6; m++) {
      const qty = Math.max(1, Math.floor(monthlyRate * (0.5 + Math.random())));
      const d = new Date(now);
      d.setMonth(d.getMonth() - m);
      d.setDate(Math.floor(Math.random() * 28) + 1);

      salesRows.push({
        product_id: pid,
        quantity: qty,
        revenue: qty * Number(prod.selling_price),
        channel: Math.random() > 0.2 ? "shopify" : "elle",
        sold_at: d.toISOString(),
      });
    }
  }

  const { error: salesErr } = await supabase.from("sales").insert(salesRows);
  results.sales = salesErr ? `error: ${salesErr.message}` : `${salesRows.length}件`;

  // 5. Orders
  const orderStatuses = ["企画中", "発注準備", "発注済", "素材調達中", "製造中", "仕上げ", "品質検査", "出荷準備", "輸送中", "通関", "国内配送", "完了"];
  const orderRows = [];
  for (let i = 0; i < 10; i++) {
    const prod = (prodData || [])[i % productIds.length];
    if (!prod) continue;
    const status = orderStatuses[i % orderStatuses.length];
    const orderedDate = new Date(now);
    orderedDate.setDate(orderedDate.getDate() - 30 - i * 10);
    const expectedDate = new Date(orderedDate);
    expectedDate.setDate(expectedDate.getDate() + 105);

    orderRows.push({
      product_id: prod.id,
      supplier_id: prod.supplier_id,
      quantity: [20, 30, 50, 40, 60][i % 5],
      unit_cost: Number(prod.cost_price_inr || 500),
      total_cost: [20, 30, 50, 40, 60][i % 5] * Number(prod.cost_price_inr || 500),
      status,
      ordered_at: orderedDate.toISOString().slice(0, 10),
      expected_delivery: expectedDate.toISOString().slice(0, 10),
    });
  }

  const { error: orderErr } = await supabase.from("orders").insert(orderRows);
  results.orders = orderErr ? `error: ${orderErr.message}` : `${orderRows.length}件`;

  // 6. Events
  const events = [
    { name: "Mother's Day Campaign", type: "campaign", start_date: "2026-04-20", end_date: "2026-05-11", sales_coefficient: 1.5, target_amount: 500000 },
    { name: "Summer Sale", type: "seasonal", start_date: "2026-06-15", end_date: "2026-07-15", sales_coefficient: 1.3, target_amount: 300000 },
    { name: "Christmas Pop-up", type: "popup", start_date: "2026-12-01", end_date: "2026-12-25", sales_coefficient: 2.0, target_amount: 800000 },
  ];
  const { error: eventErr } = await supabase.from("events").insert(events);
  results.events = eventErr ? `error: ${eventErr.message}` : `${events.length}件`;

  return NextResponse.json({ timestamp: new Date().toISOString(), results });
}
