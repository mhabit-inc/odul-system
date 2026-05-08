import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import ReactPDF from "@react-pdf/renderer";
import { ProposalDocument } from "@/lib/proposal-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*, proposal_templates(*), seasons(name, year)")
    .eq("id", id)
    .single();

  if (!proposal) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const sections: Array<{ key: string; label: string; type: string }> =
    proposal.proposal_templates?.sections || [];

  const stream = await ReactPDF.renderToStream(
    ProposalDocument({
      title: proposal.title,
      season: proposal.seasons
        ? `${proposal.seasons.name} ${proposal.seasons.year}`
        : null,
      templateName: proposal.proposal_templates?.name || "",
      sections,
      content: proposal.content || {},
      createdAt: proposal.created_at,
      status: proposal.status,
    })
  );

  const chunks: Uint8Array[] = [];
  const reader = stream as unknown as AsyncIterable<Uint8Array>;
  for await (const chunk of reader) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="proposal-${id}.pdf"`,
    },
  });
}
