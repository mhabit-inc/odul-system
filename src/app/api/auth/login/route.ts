import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request.json();
  const expected = process.env.SITE_PASSWORD || "odul2026";

  if (password !== expected) {
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("odul_auth", "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}
