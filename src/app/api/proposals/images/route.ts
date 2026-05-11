import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

const BUCKET = "proposal-images";

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const proposalId = url.searchParams.get("proposal_id");
  if (!proposalId) {
    return NextResponse.json({ error: "proposal_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(proposalId, { sortBy: { column: "created_at", order: "asc" } });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const images = (data || [])
    .filter((f) => !f.name.startsWith("."))
    .map((f) => ({
      name: f.name,
      url: `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${proposalId}/${f.name}`,
      size: f.metadata?.size || 0,
      created_at: f.created_at,
    }));

  return NextResponse.json(images);
}

export async function POST(request: Request) {
  await ensureBucket();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const proposalId = formData.get("proposal_id") as string;

  if (!file || !proposalId) {
    return NextResponse.json({ error: "file and proposal_id are required" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${proposalId}/${fileName}`;

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

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([`${proposal_id}/${name}`]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
