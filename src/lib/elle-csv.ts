import { createAdminClient } from "./supabase";
import iconv from "iconv-lite";

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

function parseCSV(text: string): string[][] {
  const lines = text.split("\n").filter((l) => l.trim());
  return lines.map((line) =>
    line.split(",").map((cell) =>
      cell
        .trim()
        .replace(/^="(.*)"$/, "$1")
        .replace(/^"(.*)"$/, "$1")
    )
  );
}

export async function importElleOrderCSV(
  buffer: Buffer
): Promise<ImportResult> {
  const supabase = createAdminClient();
  const text = iconv.decode(buffer, "Shift_JIS");
  const rows = parseCSV(text);

  if (rows.length < 2) {
    return { imported: 0, skipped: 0, errors: ["Empty CSV"] };
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // 列インデックスを特定
  const colIndex = {
    orderDate: findCol(headers, "受注日"),
    productId: findCol(headers, "商品ＩＤ"),
    vendorId: findCol(headers, "ベンダーＩＤ"),
    unitPrice: findCol(headers, "受注単価"),
    quantity: findCol(headers, "数量"),
    amount: findCol(headers, "受注金額計"),
  };

  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };
  const sales: {
    product_id: string;
    quantity: number;
    revenue: number;
    channel: string;
    sold_at: string;
  }[] = [];

  for (const row of dataRows) {
    const vendorId = row[colIndex.vendorId]?.trim();
    if (!vendorId) {
      result.skipped++;
      continue;
    }

    // ベンダーIDでSKUマッチング
    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("sku", vendorId)
      .single();

    if (!product) {
      // SKUの先頭部分で部分マッチ
      const { data: partialMatch } = await supabase
        .from("products")
        .select("id")
        .ilike("sku", `${vendorId.split("/")[0]}%`)
        .limit(1)
        .single();

      if (!partialMatch) {
        result.skipped++;
        continue;
      }

      sales.push({
        product_id: partialMatch.id,
        quantity: parseInt(row[colIndex.quantity]) || 1,
        revenue: parseInt(row[colIndex.amount]) || 0,
        channel: "elle",
        sold_at: parseElleDate(row[colIndex.orderDate]),
      });
    } else {
      sales.push({
        product_id: product.id,
        quantity: parseInt(row[colIndex.quantity]) || 1,
        revenue: parseInt(row[colIndex.amount]) || 0,
        channel: "elle",
        sold_at: parseElleDate(row[colIndex.orderDate]),
      });
    }
  }

  if (sales.length > 0) {
    const BATCH_SIZE = 100;
    for (let i = 0; i < sales.length; i += BATCH_SIZE) {
      const batch = sales.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("sales").insert(batch);
      if (error) {
        result.errors.push(`Batch ${i / BATCH_SIZE}: ${error.message}`);
      } else {
        result.imported += batch.length;
      }
    }
  }

  return result;
}

function findCol(headers: string[], name: string): number {
  const idx = headers.findIndex((h) => h.includes(name));
  return idx >= 0 ? idx : -1;
}

function parseElleDate(value: string): string {
  if (!value) return new Date().toISOString();
  // "2026/01/15" or "2026-01-15"
  const match = value.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}T00:00:00Z`;
  }
  return new Date().toISOString();
}
