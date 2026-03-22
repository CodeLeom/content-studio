import { cookies } from "next/headers";

/**
 * Access token: user OAuth session (httpOnly cookie) or server NOTION_TOKEN (internal integration / dev).
 */
export async function getNotionAccessToken(): Promise<string | null> {
  const store = await cookies();
  const fromCookie = store.get("notion_access_token")?.value;
  if (fromCookie) return fromCookie;
  return process.env.NOTION_TOKEN?.trim() || null;
}

export function isOAuthConfigured(): boolean {
  const id = process.env.NOTION_OAUTH_CLIENT_ID?.trim();
  const secret = process.env.NOTION_OAUTH_CLIENT_SECRET?.trim();
  const redirect = process.env.NOTION_OAUTH_REDIRECT_URI?.trim();
  return Boolean(id && secret && redirect);
}
