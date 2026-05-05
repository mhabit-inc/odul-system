import { createAdminClient } from "./supabase";

const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;

type ShopifyVariant = {
  sku: string;
  inventory_quantity: number;
};

type ShopifyProduct = {
  id: number;
  variants: ShopifyVariant[];
};

export async function syncShopifyInventory() {
  const supabase = createAdminClient();

  const allVariants: { sku: string; stock: number }[] = [];
  let nextUrl: string | null =
    `https://${SHOPIFY_STORE}/admin/api/2026-04/products.json?limit=250&fields=id,variants`;

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);

    const data = (await res.json()) as { products: ShopifyProduct[] };
    for (const product of data.products) {
      for (const variant of product.variants) {
        if (variant.sku) {
          allVariants.push({ sku: variant.sku, stock: variant.inventory_quantity });
        }
      }
    }

    const linkHeader = res.headers.get("link");
    const match = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = match ? match[1] : null;
  }

  let updated = 0;
  const batchSize = 50;
  for (let i = 0; i < allVariants.length; i += batchSize) {
    const batch = allVariants.slice(i, i + batchSize);
    const skus = batch.map((v) => v.sku);

    const { data: existing } = await supabase
      .from("products")
      .select("id, sku")
      .in("sku", skus);

    if (!existing) continue;

    const skuToId = new Map(existing.map((p) => [p.sku, p.id]));
    for (const v of batch) {
      const id = skuToId.get(v.sku);
      if (!id) continue;

      await supabase
        .from("products")
        .update({ current_stock: v.stock })
        .eq("id", id);
      updated++;
    }
  }

  return { totalVariants: allVariants.length, updated };
}
