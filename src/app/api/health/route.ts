import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getNotionAccessToken, isOAuthConfigured } from "@/lib/notionSession";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasEnvToken = Boolean(process.env.NOTION_TOKEN?.trim());
  const store = await cookies();
  const hasCookie = Boolean(store.get("notion_access_token")?.value);
  const notionReady = Boolean(await getNotionAccessToken());
  /** Which credential would be used (env wins over cookie). Helps debug “token doesn’t work”. */
  const authSource: "integration_token" | "oauth_cookie" | "none" = hasEnvToken
    ? "integration_token"
    : hasCookie
      ? "oauth_cookie"
      : "none";

  return NextResponse.json({
    notionReady,
    oauthConfigured: isOAuthConfigured(),
    serverTokenConfigured: hasEnvToken,
    /** Set when NOTION_PARENT_PAGE_ID is present (required for internal integration hub creation). */
    parentPageConfigured: Boolean(process.env.NOTION_PARENT_PAGE_ID?.trim()),
    authSource,
  });
}
