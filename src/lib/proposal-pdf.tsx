import React from "react";
import path from "path";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

Font.registerHyphenationCallback((word) => [word]);

const fontDir = path.join(process.cwd(), "public", "fonts");

Font.register({
  family: "NotoSansJP",
  fonts: [
    { src: path.join(fontDir, "NotoSansJP-Regular.ttf"), fontWeight: "normal" },
    { src: path.join(fontDir, "NotoSansJP-Bold.ttf"), fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "NotoSansJP" },
  header: { marginBottom: 20, borderBottom: "1 solid #333", paddingBottom: 10 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  meta: { fontSize: 9, color: "#666", marginBottom: 2 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 6,
    backgroundColor: "#f3f4f6",
    padding: 6,
  },
  sectionContent: { paddingHorizontal: 6, lineHeight: 1.6 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
  },
});

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  review: "レビュー中",
  approved: "承認済",
  archived: "アーカイブ",
};

type Props = {
  title: string;
  season: string | null;
  templateName: string;
  sections: Array<{ key: string; label: string; type: string }>;
  content: Record<string, string>;
  createdAt: string;
  status: string;
};

export function ProposalDocument(props: Props) {
  const { title, season, templateName, sections, content, createdAt, status } = props;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>
            Template: {templateName}
            {season ? ` | Season: ${season}` : ""}
            {` | Status: ${STATUS_LABELS[status] || status}`}
          </Text>
          <Text style={styles.meta}>
            Created: {new Date(createdAt).toLocaleDateString("ja-JP")}
          </Text>
        </View>

        {sections.map((section) => (
          <View key={section.key} wrap={false}>
            <Text style={styles.sectionTitle}>{section.label}</Text>
            <Text style={styles.sectionContent}>
              {content[section.key] || "(未記入)"}
            </Text>
          </View>
        ))}

        <Text style={styles.footer} fixed>
          odul MD System - {title}
        </Text>
      </Page>
    </Document>
  );
}
