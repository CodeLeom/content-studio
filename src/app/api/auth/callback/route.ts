import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  workspace_name?: string;
};

export async function GET(request: NextRequest) {
  const base = request.nextUrl.origin;
  const appUrl = (path: string) => new URL(path, base).toString();

  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get("error");
  if (error) {
    return NextResponse.redirect(appUrl(`/app?error=${encodeURIComponent(error)}`));
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const expected = cookieStore.get("oauth_state")?.value;

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(appUrl("/app?error=invalid_oauth_state"));
  }

  const clientId = process.env.NOTION_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET?.trim();
  const redirectUri = process.env.NOTION_OAUTH_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(appUrl("/app?error=oauth_not_configured"));
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = (await tokenRes.json()) as TokenResponse;
  if (!tokenRes.ok || !data.access_token) {
    const msg = data.error ?? `token_exchange_failed_${tokenRes.status}`;
    return NextResponse.redirect(appUrl(`/app?error=${encodeURIComponent(msg)}`));
  }

  const res = NextResponse.redirect(appUrl("/app?connected=1"));
  res.cookies.delete("oauth_state");
  res.cookies.set("notion_access_token", data.access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
    secure: process.env.NODE_ENV === "production",
  });
  if (data.refresh_token) {
    res.cookies.set("notion_refresh_token", data.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}
