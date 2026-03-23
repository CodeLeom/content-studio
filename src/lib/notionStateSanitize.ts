import type { Client } from "@notionhq/client";
import { APIErrorCode, APIResponseError } from "@notionhq/client";
import type { StudioState } from "../state";

/** True if the error means we should drop the id and recreate / re-resolve. */
function isRecoverableNotionResourceError(e: unknown): boolean {
  if (!APIResponseError.isAPIResponseError(e)) return false;
  if (e.code === APIErrorCode.ObjectNotFound) return true;
  if (e.code === APIErrorCode.RestrictedResource) return true;
  const m = (e.message ?? "").toLowerCase();
  if (m.includes("archived") || m.includes("ancestor")) return true;
  return false;
}

async function pageAccessible(client: Client, pageId: string): Promise<boolean> {
  try {
    await client.pages.retrieve({ page_id: pageId });
    return true;
  } catch (e) {
    if (isRecoverableNotionResourceError(e)) return false;
    throw e;
  }
}

async function databaseAccessible(client: Client, databaseId: string): Promise<boolean> {
  try {
    await client.databases.retrieve({ database_id: databaseId });
    return true;
  } catch (e) {
    if (isRecoverableNotionResourceError(e)) return false;
    throw e;
  }
}

/**
 * Drops Notion ids that no longer work (deleted/archived hub, DB, or profile page).
 * Call before ensureHub / ensureContentPipeline so setup can recreate resources.
 */
export async function sanitizeStudioState(
  client: Client,
  state: StudioState,
  onLog?: (m: string) => void
): Promise<StudioState> {
  let s: StudioState = { ...state };

  if (s.hubPageId) {
    const ok = await pageAccessible(client, s.hubPageId);
    if (!ok) {
      onLog?.(
        "Hub page is missing or under an archived parent — cleared saved IDs. A new hub will be created or found on the next step."
      );
      return {};
    }
  }

  if (s.creatorProfilePageId) {
    const ok = await pageAccessible(client, s.creatorProfilePageId);
    if (!ok) {
      onLog?.("Creator Profile page was removed — will recreate under the hub.");
      const next = { ...s };
      delete next.creatorProfilePageId;
      s = next;
    }
  }

  if (s.contentPipelineDatabaseId) {
    const ok = await databaseAccessible(client, s.contentPipelineDatabaseId);
    if (!ok) {
      onLog?.("Content Pipeline database was removed — will recreate under the hub.");
      s = {
        ...s,
        contentPipelineDatabaseId: undefined,
        contentPipelineDataSourceId: undefined,
      };
    }
  } else if (s.contentPipelineDataSourceId) {
    s = { ...s, contentPipelineDataSourceId: undefined };
  }

  return s;
}
