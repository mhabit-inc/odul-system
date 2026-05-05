import { createAdminClient } from "./supabase";

const SHOPIFY_STORE = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;

const VENDOR_CLASS_MAP: Record<string, string> = {
  signature: "定番",
  basic: "セミ定番",
  ödül: "未分類",
  novelty: "ノベルティ",
  archive: "アーカイブ",
  wrapin: "ラッピング",
};

function classifyByVendor(vendor: string): string {
  const lower = vendor.toLowerCase();
  if (VENDOR_CLASS_MAP[lower]) return VENDOR_CLASS_MAP[lower];
  if (/^\d{2}(AW|HO|SS|PRE)$/i.test(vendor)) return "新作";
  return "未分類";
}

type ShopifyProduct = {
  id: number;
  vendor: string;
  variants: { sku: string }[];
};

async function fetchAllShopifyProducts(): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];
  let url: string | null =
    `https://${SHOPIFY_STORE}/admin/api/2026-04/products.json?limit=250&fields=id,vendor,variants`;

  while (url) {
    const res = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_TOKEN,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);

    const data = (await res.json()) as { products: ShopifyProduct[] };
    all.push(...data.products);

    const linkHeader = res.headers.get("link");
    const match = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
    url = match ? match[1] : null;
  }

  return all;
}

export async function syncVendorClassification() {
  const supabase = createAdminClient();
  const shopifyProducts = await fetchAllShopifyProducts();

  const stats = {
    total_shopify: shopifyProducts.length,
    matched: 0,
    updated: 0,
    by_class: {} as Record<string, number>,
    errors: [] as string[],
  };

  for (const sp of shopifyProducts) {
    const productClass = classifyByVendor(sp.vendor);
    stats.by_class[productClass] = (stats.by_class[productClass] || 0) + 1;

    for (const variant of sp.variants) {
      if (!variant.sku) continue;

      const { data: existing } = await supabase
        .from("products")
        .select("id, product_class")
        .eq("sku", variant.sku)
        .single();

      if (!existing) continue;
      stats.matched++;

      if (existing.product_class !== productClass) {
        const { error } = await supabase
          .from("products")
          .update({ product_class: productClass })
          .eq("id", existing.id);

        if (error) {
          stats.errors.push(`${variant.sku}: ${error.message}`);
        } else {
          stats.updated++;
        }
      }
    }
  }

  return stats;
}
