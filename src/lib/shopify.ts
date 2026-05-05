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

async function shopifyFetch(endpoint: string): Promise<{ json: unknown; linkHeader: string | null }> {
  const res = await fetch(
    `https://${SHOPIFY_STORE}/admin/api/2026-04/${endpoint}`,
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
  return { json: await res.json(), linkHeader: res.headers.get("link") };
}

function getNextPageUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

async function fetchAllOrders(since: string): Promise<ShopifyOrder[]> {
  const allOrders: ShopifyOrder[] = [];
  let endpoint: string | null =
    `orders.json?status=any&created_at_min=${since}&limit=250&fields=id,created_at,line_items`;

  while (endpoint) {
    const { json, linkHeader } = await shopifyFetch(endpoint);
    const data = json as { orders: ShopifyOrder[] };
    allOrders.push(...data.orders);

    const nextUrl = getNextPageUrl(linkHeader);
    if (nextUrl) {
      const url = new URL(nextUrl);
      endpoint = url.pathname.replace(`/admin/api/2026-04/`, "") + url.search;
    } else {
      endpoint = null;
    }
  }

  return allOrders;
}

export async function syncShopifyOrders(sinceDate?: string) {
  const supabase = createAdminClient();
  const since = sinceDate || getYesterday();

  const orders = await fetchAllOrders(since);

  const sales: {
    product_id: string;
    quantity: number;
    revenue: number;
    channel: string;
    sold_at: string;
  }[] = [];

  for (const order of orders) {
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
    return { imported: 0, orders: orders.length };
  }

  const batchSize = 100;
  let inserted = 0;
  for (let i = 0; i < sales.length; i += batchSize) {
    const batch = sales.slice(i, i + batchSize);
    const { error } = await supabase.from("sales").insert(batch);
    if (error) throw new Error(`Sales insert error: ${error.message}`);
    inserted += batch.length;
  }

  return { imported: inserted, orders: orders.length };
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}
