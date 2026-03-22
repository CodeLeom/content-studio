import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AUTH = "https://api.notion.com/v1/oauth/authorize";

export async function GET() {
  const clientId = process.env.NOTION_OAUTH_CLIENT_ID?.trim();
  const redirectUri = process.env.NOTION_OAUTH_REDIRECT_URI?.trim();
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "OAuth is not configured. Set NOTION_OAUTH_CLIENT_ID, NOTION_OAUTH_CLIENT_SECRET, and NOTION_OAUTH_REDIRECT_URI." },
      { status: 501 }
    );
  }

  const state = randomBytes(24).toString("hex");
  const url = new URL(AUTH);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("owner", "user");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
