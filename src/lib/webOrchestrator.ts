import type { Client } from "@notionhq/client";
import type { CalendarItem, CreatorProfile } from "../types.js";
import type { StudioState } from "../state.js";
import { parseCreatorProfileBody } from "../notion/profileText.js";
import {
  CREATOR_PROFILE_TITLE,
  addPipelineRowsWithLog,
  createContentPipelineDatabase,
  createCreatorProfilePage,
  createHubPage,
  findChildPageByTitle,
  findDatabaseUnderHub,
  findHubPageId,
  getPagePlainText,
  queryDataSourceAll,
  createClient,
  updateCreatorProfilePage,
} from "./notionRest.js";

export async function ensureHub(client: Client, state: StudioState): Promise<StudioState> {
  let hub = state.hubPageId ?? (await findHubPageId(client));
  if (!hub) hub = await createHubPage(client);
  return { ...state, hubPageId: hub };
}

export async function ensureCreatorProfile(
  client: Client,
  state: StudioState,
  profile: CreatorProfile,
  updateExisting: boolean
): Promise<StudioState> {
  if (!state.hubPageId) throw new Error("Hub page missing");
  let profileId =
    state.creatorProfilePageId ?? (await findChildPageByTitle(client, state.hubPageId, CREATOR_PROFILE_TITLE));
  if (!profileId) {
    profileId = await createCreatorProfilePage(client, state.hubPageId, profile);
  } else if (updateExisting) {
    await updateCreatorProfilePage(client, profileId, profile);
  }
  return { ...state, creatorProfilePageId: profileId };
}

export async function ensureContentPipeline(client: Client, state: StudioState): Promise<StudioState> {
  if (!state.hubPageId) throw new Error("Hub page missing");
  let dbId = state.contentPipelineDatabaseId ?? (await findDatabaseUnderHub(client, state.hubPageId));
  let dsId = state.contentPipelineDataSourceId;
  if (!dbId) {
    const created = await createContentPipelineDatabase(client, state.hubPageId);
    dbId = created.databaseId;
    dsId = created.dataSourceId;
  } else if (!dsId) {
    const db = await client.databases.retrieve({ database_id: dbId });
    dsId = "data_sources" in db ? db.data_sources?.[0]?.id : undefined;
    if (!dsId) throw new Error("Could not resolve data source id");
  }
  return { ...state, contentPipelineDatabaseId: dbId, contentPipelineDataSourceId: dsId };
}

export async function loadProfileFromNotion(client: Client, state: StudioState): Promise<CreatorProfile | null> {
  let pageId = state.creatorProfilePageId;
  if (!pageId && state.hubPageId) {
    pageId = (await findChildPageByTitle(client, state.hubPageId, CREATOR_PROFILE_TITLE)) ?? undefined;
  }
  if (!pageId) return null;
  const text = await getPagePlainText(client, pageId);
  return parseCreatorProfileBody(text);
}

export async function isPipelineEmpty(client: Client, dataSourceId: string): Promise<boolean> {
  const rows = await queryDataSourceAll(client, dataSourceId);
  return rows.length === 0;
}

export function getClientForRequest(token: string): Client {
  return createClient(token);
}

export async function seedCalendar(
  client: Client,
  databaseId: string,
  items: CalendarItem[],
  onLog: (m: string) => void
): Promise<void> {
  await addPipelineRowsWithLog(client, databaseId, items, onLog);
}
