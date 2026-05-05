import { createAdminClient } from "./supabase";

const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;

type ShopifyOrder = {
  id: number;
  created_at: string;
  line_items: {
    sku: string;
    quantity: number;
    price: string;
  }[];
};

async function shopifyFetch(endpoint: string): Promise<unknown> {
  const res = await fetch(
    `https://${SHOPIFY_STORE}/admin/api/2024-01/${endpoint}`,
    {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok) {
    throw new Error(`Shopify API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function syncShopifyOrders(sinceDate?: string) {
  const supabase = createAdminClient();
  const since = sinceDate || getYesterday();

  const data = (await shopifyFetch(
    `orders.json?status=any&created_at_min=${since}&fields=id,created_at,line_items`
  )) as { orders: ShopifyOrder[] };

  const sales: {
    product_id: string;
    quantity: number;
    revenue: number;
    channel: string;
    sold_at: string;
  }[] = [];

  for (const order of data.orders) {
    for (const item of order.line_items) {
      if (!item.sku) continue;

      const { data: product } = await supabase
        .from("products")
        .select("id")
        .eq("sku", item.sku)
        .single();

      if (!product) continue;

      sales.push({
        product_id: product.id,
        quantity: item.quantity,
        revenue: Math.round(parseFloat(item.price) * item.quantity),
        channel: "shopify",
        sold_at: order.created_at,
      });
    }
  }

  if (sales.length === 0) {
    return { imported: 0, orders: data.orders.length };
  }

  const { error } = await supabase.from("sales").insert(sales);
  if (error) throw new Error(`Sales insert error: ${error.message}`);

  return { imported: sales.length, orders: data.orders.length };
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}
