import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const supplierId = url.searchParams.get("supplier_id");
  const seasonId = url.searchParams.get("season_id");
  const includeJpy = url.searchParams.get("include_jpy") === "true";

  if (!supplierId) {
    return NextResponse.json(
      { error: "supplier_id required" },
      { status: 400 }
    );
  }

  const { data: supplier } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", supplierId)
    .single();

  if (!supplier) {
    return NextResponse.json({ error: "supplier not found" }, { status: 404 });
  }

  let productQuery = supabase
    .from("products")
    .select("*")
    .eq("supplier_id", supplierId)
    .order("sku");

  if (seasonId) {
    productQuery = productQuery.eq("season_id", seasonId);
  }

  const { data: products } = await productQuery;

  if (!products || products.length === 0) {
    return NextResponse.json(
      { error: "no products found for this supplier" },
      { status: 404 }
    );
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`${supplier.name} 発注シート`);

  const columns: Partial<ExcelJS.Column>[] = [
    { header: "No", key: "no", width: 5 },
    { header: "商品コード", key: "sku", width: 14 },
    { header: "商品名", key: "name", width: 25 },
    { header: "商品名(EN)", key: "name_en", width: 25 },
    { header: "カテゴリ", key: "category", width: 12 },
    { header: "素材", key: "material", width: 12 },
    { header: "カラー", key: "color", width: 10 },
    { header: "石1", key: "stone_1", width: 15 },
    { header: "石2", key: "stone_2", width: 15 },
    { header: "石3", key: "stone_3", width: 15 },
    { header: "サイズ展開", key: "size_options", width: 15 },
    { header: "単価(INR)", key: "cost_inr", width: 12 },
  ];

  if (includeJpy) {
    columns.push(
      { header: "為替レート", key: "exchange_rate", width: 10 },
      { header: "原価(JPY)", key: "cost_jpy", width: 12 }
    );
  }

  columns.push(
    { header: "販売価格(JPY)", key: "selling_price", width: 14 },
    { header: "数量", key: "quantity", width: 8 },
    { header: "金額(INR)", key: "total_inr", width: 14 }
  );

  if (supplier.has_inspection_columns) {
    columns.push(
      { header: "検品: 良品数", key: "inspect_good", width: 12 },
      { header: "検品: 不良品数", key: "inspect_bad", width: 12 },
      { header: "検品: 備考", key: "inspect_notes", width: 20 }
    );
  }

  columns.push({ header: "備考", key: "notes", width: 20 });

  sheet.columns = columns;

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, size: 10 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF2F2F2" },
  };
  headerRow.alignment = { vertical: "middle" };

  products.forEach((p, i) => {
    const rowData: Record<string, unknown> = {
      no: i + 1,
      sku: p.sku,
      name: p.name,
      name_en: p.name_en || "",
      category: p.category,
      material: p.material || "",
      color: p.color || "",
      stone_1: p.stone_1 || "",
      stone_2: p.stone_2 || "",
      stone_3: p.stone_3 || "",
      size_options: p.size_options || "",
      cost_inr: p.cost_price_inr ? Number(p.cost_price_inr) : "",
      selling_price: p.selling_price ? Number(p.selling_price) : "",
      quantity: "",
      total_inr: "",
      notes: "",
    };

    if (includeJpy) {
      rowData.exchange_rate = p.exchange_rate ? Number(p.exchange_rate) : "";
      rowData.cost_jpy = p.cost_price_jpy ? Number(p.cost_price_jpy) : "";
    }

    if (supplier.has_inspection_columns) {
      rowData.inspect_good = "";
      rowData.inspect_bad = "";
      rowData.inspect_notes = "";
    }

    sheet.addRow(rowData);
  });

  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      if (rowNumber > 1) {
        cell.font = { size: 10 };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${supplier.code || supplier.name}_order_sheet.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
