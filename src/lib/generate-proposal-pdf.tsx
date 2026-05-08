import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";

Font.register({
  family: "NotoSansJP",
  src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.1/files/noto-sans-jp-japanese-400-normal.woff",
});

Font.register({
  family: "NotoSansJP-Bold",
  src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.1/files/noto-sans-jp-japanese-700-normal.woff",
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "NotoSansJP",
    fontSize: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: "NotoSansJP-Bold",
  },
  subtitle: {
    fontSize: 9,
    color: "#666",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "NotoSansJP-Bold",
    marginBottom: 6,
    backgroundColor: "#f5f5f5",
    padding: 4,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    paddingVertical: 3,
  },
  label: {
    width: 120,
    color: "#666",
    fontSize: 9,
  },
  value: {
    flex: 1,
    fontSize: 10,
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableCell: {
    fontSize: 9,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
  },
  summaryBox: {
    backgroundColor: "#1a1a1a",
    color: "white",
    padding: 12,
    borderRadius: 4,
    marginTop: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  summaryLabel: {
    color: "#ccc",
    fontSize: 9,
  },
  summaryValue: {
    fontFamily: "NotoSansJP-Bold",
    fontSize: 12,
  },
});

export type ProposalData = {
  seasonName: string;
  seasonYear: number;
  seasonPeriod: string;
  shootingDate: string | null;
  shootingCost: number | null;
  plans: Array<{
    categoryName: string;
    ownerRole: string | null;
    styles: number;
    quantity: number;
    expectedRevenue: number;
    launchDate: string | null;
    sellThrough: number | null;
    avgUnitPrice: number | null;
  }>;
  totalStyles: number;
  totalQuantity: number;
  totalRevenue: number;
  createdAt: string;
};

function ProposalDocument({ data }: { data: ProposalData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>企画書</Text>
            <Text style={styles.subtitle}>ödül / Mhabit Inc.</Text>
          </View>
          <View>
            <Text style={styles.subtitle}>作成日: {data.createdAt}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>シーズン情報</Text>
          <View style={styles.row}>
            <Text style={styles.label}>シーズン</Text>
            <Text style={styles.value}>
              {data.seasonName} {data.seasonYear}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>期間</Text>
            <Text style={styles.value}>{data.seasonPeriod}</Text>
          </View>
          {data.shootingDate && (
            <View style={styles.row}>
              <Text style={styles.label}>撮影日</Text>
              <Text style={styles.value}>
                {data.shootingDate}
                {data.shootingCost &&
                  ` (¥${data.shootingCost.toLocaleString()})`}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>企画分類別 発注計画</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { width: 140 }]}>企画分類</Text>
              <Text style={[styles.tableCell, { width: 50 }]}>担当</Text>
              <Text style={[styles.tableCell, { width: 40, textAlign: "right" }]}>型数</Text>
              <Text style={[styles.tableCell, { width: 55, textAlign: "right" }]}>発注数</Text>
              <Text style={[styles.tableCell, { width: 80, textAlign: "right" }]}>期待売上</Text>
              <Text style={[styles.tableCell, { width: 50, textAlign: "right" }]}>消化率</Text>
              <Text style={[styles.tableCell, { width: 70, textAlign: "right" }]}>発売日</Text>
            </View>
            {data.plans.map((plan, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: 140 }]}>
                  {plan.categoryName}
                </Text>
                <Text style={[styles.tableCell, { width: 50, color: "#666" }]}>
                  {plan.ownerRole || "-"}
                </Text>
                <Text style={[styles.tableCell, { width: 40, textAlign: "right" }]}>
                  {plan.styles}
                </Text>
                <Text style={[styles.tableCell, { width: 55, textAlign: "right" }]}>
                  {plan.quantity.toLocaleString()}
                </Text>
                <Text style={[styles.tableCell, { width: 80, textAlign: "right" }]}>
                  ¥{plan.expectedRevenue.toLocaleString()}
                </Text>
                <Text style={[styles.tableCell, { width: 50, textAlign: "right" }]}>
                  {plan.sellThrough ? `${plan.sellThrough}%` : "-"}
                </Text>
                <Text style={[styles.tableCell, { width: 70, textAlign: "right" }]}>
                  {plan.launchDate || "-"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>合計型数</Text>
            <Text style={styles.summaryValue}>{data.totalStyles}型</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>合計発注数</Text>
            <Text style={styles.summaryValue}>
              {data.totalQuantity.toLocaleString()}個
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>合計期待売上</Text>
            <Text style={styles.summaryValue}>
              ¥{data.totalRevenue.toLocaleString()}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>ödül - MD業務システム</Text>
      </Page>
    </Document>
  );
}

export async function generateProposalPdf(
  data: ProposalData
): Promise<Buffer> {
  return await renderToBuffer(<ProposalDocument data={data} />);
}
