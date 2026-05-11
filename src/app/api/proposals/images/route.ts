import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

const BUCKET = "uploads";
const PREFIX = "proposals";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const proposalId = url.searchParams.get("proposal_id");
  if (!proposalId) {
    return NextResponse.json({ error: "proposal_id is required" }, { status: 400 });
  }

  const folder = `${PREFIX}/${proposalId}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(folder, { sortBy: { column: "created_at", order: "asc" } });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const images = (data || [])
    .filter((f) => !f.name.startsWith("."))
    .map((f) => ({
      name: f.name,
      url: `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${folder}/${f.name}`,
      size: f.metadata?.size || 0,
      created_at: f.created_at,
    }));

  return NextResponse.json(images);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const proposalId = formData.get("proposal_id") as string;

  if (!file || !proposalId) {
    return NextResponse.json({ error: "file and proposal_id are required" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${PREFIX}/${proposalId}/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const url = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;

  return NextResponse.json({ name: fileName, url }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { proposal_id, name } = await request.json();

  if (!proposal_id || !name) {
    return NextResponse.json({ error: "proposal_id and name are required" }, { status: 400 });
  }

  const path = `${PREFIX}/${proposal_id}/${name}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
