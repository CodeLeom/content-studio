import { cookies } from "next/headers";

/**
 * Access token: `NOTION_TOKEN` (internal integration) when set, else OAuth cookie.
 * Env wins so a valid integration token isn’t overridden by an old or invalid browser session.
 */
export async function getNotionAccessToken(): Promise<string | null> {
  const fromEnv = process.env.NOTION_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  const store = await cookies();
  return store.get("notion_access_token")?.value ?? null;
}

export function isOAuthConfigured(): boolean {
  const id = process.env.NOTION_OAUTH_CLIENT_ID?.trim();
  const secret = process.env.NOTION_OAUTH_CLIENT_SECRET?.trim();
  const redirect = process.env.NOTION_OAUTH_REDIRECT_URI?.trim();
  return Boolean(id && secret && redirect);
}
