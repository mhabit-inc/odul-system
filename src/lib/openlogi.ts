import { createAdminClient } from "./supabase";

const OPENLOGI_API_URL =
  process.env.OPENLOGI_API_URL || "https://api.openlogi.com/api";
const OPENLOGI_TOKEN = process.env.OPENLOGI_ACCESS_TOKEN!;

type OpenLogiItem = {
  id: string;
  code: string;
  name: string;
  stock: {
    available: number;
    shipping: number;
    reserved: number;
  };
};

async function openlogiFetch(endpoint: string): Promise<unknown> {
  const res = await fetch(`${OPENLOGI_API_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${OPENLOGI_TOKEN}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`OpenLogi API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function syncOpenLogiInventory() {
  const supabase = createAdminClient();

  let page = 1;
  let totalUpdated = 0;
  let hasMore = true;

  while (hasMore) {
    const data = (await openlogiFetch(
      `/items?page=${page}&per_page=100&stock=1`
    )) as { data: OpenLogiItem[]; meta: { last_page: number } };

    for (const item of data.data) {
      if (!item.code) continue;

      const { error } = await supabase
        .from("products")
        .update({
          current_stock: item.stock.available,
        })
        .eq("sku", item.code);

      if (!error) totalUpdated++;
    }

    hasMore = page < data.meta.last_page;
    page++;
  }

  return { updated: totalUpdated, pages: page - 1 };
}
