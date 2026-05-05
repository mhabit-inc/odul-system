import { google } from "googleapis";

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || "商品マスタ";

// 商品マスタのヘッダー行は2行目、データは6行目以降
const HEADER_ROW = 2;
const DATA_START_ROW = 6;

type SheetRow = Record<string, string>;

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export async function fetchProductMaster(): Promise<SheetRow[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  // ヘッダー行を取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${HEADER_ROW}:CZ${HEADER_ROW}`,
  });
  const headers = headerResponse.data.values?.[0] || [];

  // データ行を取得（6行目以降）
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${DATA_START_ROW}:CZ`,
  });
  const rows = dataResponse.data.values || [];

  return rows
    .filter((row) => row.some((cell) => cell?.trim()))
    .map((row) => {
      const obj: SheetRow = {};
      headers.forEach((header: string, i: number) => {
        if (header?.trim()) {
          obj[header.trim()] = row[i]?.trim() || "";
        }
      });
      return obj;
    });
}
