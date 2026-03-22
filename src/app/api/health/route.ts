import { NextResponse } from "next/server";
import { getNotionAccessToken, isOAuthConfigured } from "@/lib/notionSession";

export const dynamic = "force-dynamic";

export async function GET() {
  const notionReady = Boolean(await getNotionAccessToken());
  return NextResponse.json({
    notionReady,
    oauthConfigured: isOAuthConfigured(),
  });
}
