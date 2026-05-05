import { createClient } from "@supabase/supabase-js";

const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Variant = { sku: string; inventory_quantity: number };
type Product = { id: number; variants: Variant[] };

async function main() {
  console.log("Fetching products from Shopify...");
  const allVariants: { sku: string; stock: number }[] = [];
  let nextUrl: string | null =
    `https://${SHOPIFY_STORE}/admin/api/2026-04/products.json?limit=250&fields=id,variants`;

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: { "X-Shopify-Access-Token": SHOPIFY_TOKEN },
    });
    const data = (await res.json()) as { products: Product[] };
    for (const p of data.products) {
      for (const v of p.variants) {
        if (v.sku) allVariants.push({ sku: v.sku, stock: v.inventory_quantity });
      }
    }
    console.log(`  fetched ${allVariants.length} variants so far...`);
    const link = res.headers.get("link");
    const match = link?.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = match ? match[1] : null;
  }

  console.log(`Total variants: ${allVariants.length}`);
  console.log("Updating database...");

  let updated = 0;
  for (let i = 0; i < allVariants.length; i += 50) {
    const batch = allVariants.slice(i, i + 50);
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
      await supabase.from("products").update({ current_stock: v.stock }).eq("id", id);
      updated++;
    }
    process.stdout.write(`\r  updated ${updated}/${allVariants.length}`);
  }

  console.log(`\nDone! Updated ${updated} products.`);
}

main().catch(console.error);
