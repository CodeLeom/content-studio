/** Notion REST API (@notionhq/client) for Next.js API routes. */
import { Client } from "@notionhq/client";
import type { CalendarItem, CreatorProfile, PipelineRow } from "../types.js";
import { toRichTextArray } from "../notion/richText.js";

const HUB_TITLE = "Notion AI Content Studio Hub";
export const CREATOR_PROFILE_TITLE = "Creator Profile";
export const PIPELINE_TITLE = "Content Pipeline";

export const PROP = {
  title: "Title",
  status: "Status",
  platform: "Platform",
  scheduledDate: "Scheduled Date",
  hook: "Hook",
  script: "Script",
  repurposedOutputs: "Repurposed Outputs",
} as const;

export function createClient(token: string): Client {
  return new Client({ auth: token, notionVersion: "2025-09-03" });
}

function rt(content: string) {
  return [{ type: "text" as const, text: { content } }];
}

export async function searchPages(client: Client, query: string): Promise<string[]> {
  const res = await client.search({
    query,
    page_size: 25,
    filter: { property: "object", value: "page" },
  });
  return res.results.map((r) => ("id" in r ? r.id : "")).filter(Boolean);
}

export async function findHubPageId(client: Client): Promise<string | null> {
  const ids = await searchPages(client, HUB_TITLE);
  for (const id of ids) {
    const page = await client.pages.retrieve({ page_id: id });
    if (!("properties" in page)) continue;
    const t = page.properties.title as { title?: Array<{ plain_text?: string }> } | undefined;
    const name = t?.title?.map((x) => x.plain_text).join("") ?? "";
    if (name === HUB_TITLE) return id;
  }
  return null;
}

export async function createHubPage(client: Client): Promise<string> {
  const res = await client.pages.create({
    parent: { workspace: true },
    properties: {
      title: { title: rt(HUB_TITLE) },
    },
  });
  return res.id;
}

export async function getBlockChildren(client: Client, blockId: string) {
  const out: Array<{ type?: string; id?: string; [k: string]: unknown }> = [];
  let cursor: string | undefined;
  for (;;) {
    const res = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    out.push(...(res.results as Array<{ type?: string; id?: string }>));
    if (!res.has_more || !res.next_cursor) break;
    cursor = res.next_cursor;
  }
  return out;
}

function richTextPlain(rich: unknown): string {
  if (!Array.isArray(rich)) return "";
  return (rich as Array<{ plain_text?: string }>)
    .map((r) => r.plain_text ?? "")
    .join("");
}

function blockPlainText(block: Record<string, unknown>): string {
  const t = block.type as string;
  const inner = block[t] as Record<string, unknown> | undefined;
  if (!inner) return "";
  if (inner.rich_text) return richTextPlain(inner.rich_text);
  return "";
}

export async function getPagePlainText(client: Client, pageId: string): Promise<string> {
  const blocks = await getBlockChildren(client, pageId);
  return blocks.map((b) => blockPlainText(b as Record<string, unknown>)).filter(Boolean).join("\n");
}

export async function findChildPageByTitle(
  client: Client,
  parentId: string,
  title: string
): Promise<string | null> {
  const blocks = await getBlockChildren(client, parentId);
  for (const b of blocks) {
    if (b.type !== "child_page") continue;
    const id = b.id;
    if (!id) continue;
    const page = await client.pages.retrieve({ page_id: id });
    if (!("properties" in page)) continue;
    const tp = page.properties.title as { title?: Array<{ plain_text?: string }> } | undefined;
    const name = tp?.title?.map((x) => x.plain_text).join("") ?? "";
    if (name === title) return id;
  }
  return null;
}

function databaseTitle(db: { title?: Array<{ plain_text?: string }> }): string {
  return db.title?.map((x) => x.plain_text).join("") ?? "";
}

export async function findDatabaseUnderHub(client: Client, hubId: string): Promise<string | null> {
  const blocks = await getBlockChildren(client, hubId);
  for (const b of blocks) {
    if (b.type !== "child_database") continue;
    const id = b.id;
    if (!id) continue;
    const db = await client.databases.retrieve({ database_id: id });
    if (!("title" in db)) continue;
    const name = databaseTitle(db);
    if (name === PIPELINE_TITLE) return id;
  }
  return null;
}

function buildInitialDataSourceProperties() {
  return {
    [PROP.title]: { title: {} },
    [PROP.status]: {
      select: {
        options: [
          { name: "Idea", color: "gray" },
          { name: "Draft", color: "blue" },
          { name: "Repurposed", color: "purple" },
          { name: "Ready", color: "green" },
        ],
      },
    },
    [PROP.platform]: {
      select: {
        options: [
          { name: "YouTube", color: "red" },
          { name: "TikTok", color: "pink" },
          { name: "X", color: "default" },
          { name: "LinkedIn", color: "blue" },
          { name: "Instagram", color: "purple" },
        ],
      },
    },
    [PROP.scheduledDate]: { date: {} },
    [PROP.hook]: { rich_text: {} },
    [PROP.script]: { rich_text: {} },
    [PROP.repurposedOutputs]: { rich_text: {} },
  };
}

export async function createContentPipelineDatabase(
  client: Client,
  hubPageId: string
): Promise<{ databaseId: string; dataSourceId: string }> {
  const created = await client.databases.create({
    parent: { type: "page_id", page_id: hubPageId },
    title: [{ type: "text", text: { content: PIPELINE_TITLE } }],
    initial_data_source: {
      properties: buildInitialDataSourceProperties() as never,
    },
  });
  const full = await client.databases.retrieve({ database_id: created.id });
  const ds = "data_sources" in full ? full.data_sources?.[0] : undefined;
  if (!ds?.id) throw new Error("Could not resolve data source id from new database");
  return { databaseId: created.id, dataSourceId: ds.id };
}

export async function createCreatorProfilePage(
  client: Client,
  hubId: string,
  profile: CreatorProfile
): Promise<string> {
  const body = [
    "Platforms: " + profile.platforms.join(", "),
    "Niche: " + profile.niche,
    "Posting frequency: " + profile.postingFrequency,
    "Content style: " + profile.contentStyle,
    "Tone: " + profile.tone,
  ].join("\n");
  const res = await client.pages.create({
    parent: { page_id: hubId, type: "page_id" },
    properties: {
      title: { title: rt(CREATOR_PROFILE_TITLE) },
    },
    children: [
      {
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: body } }],
        },
      },
    ],
  });
  return res.id;
}

export async function updateCreatorProfilePage(
  client: Client,
  pageId: string,
  profile: CreatorProfile
): Promise<void> {
  const body = [
    "Platforms: " + profile.platforms.join(", "),
    "Niche: " + profile.niche,
    "Posting frequency: " + profile.postingFrequency,
    "Content style: " + profile.contentStyle,
    "Tone: " + profile.tone,
  ].join("\n");
  const existing = await getBlockChildren(client, pageId);
  for (const b of existing) {
    const bid = b.id;
    if (bid) await client.blocks.delete({ block_id: bid });
  }
  await client.blocks.children.append({
    block_id: pageId,
    children: [
      {
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: body } }],
        },
      },
    ],
  });
}

function unwrapProps(page: Record<string, unknown>): Record<string, unknown> {
  const props = page.properties as Record<string, unknown> | undefined;
  return props ?? {};
}

function titleFromProps(props: Record<string, unknown>): string {
  const t = props[PROP.title] as Record<string, unknown> | undefined;
  const titleArr = t?.title as Array<{ plain_text?: string }> | undefined;
  if (!titleArr?.length) return "";
  return titleArr.map((x) => x.plain_text ?? "").join("");
}

function selectName(props: Record<string, unknown>, key: string): string {
  const s = props[key] as { select?: { name?: string } } | undefined;
  return s?.select?.name ?? "";
}

function dateStart(props: Record<string, unknown>, key: string): string {
  const d = props[key] as { date?: { start?: string } } | undefined;
  return d?.date?.start ?? "";
}

function richProp(props: Record<string, unknown>, key: string): string {
  const r = props[key] as { rich_text?: Array<{ plain_text?: string }> } | undefined;
  return (r?.rich_text ?? []).map((x) => x.plain_text ?? "").join("");
}

export async function queryDataSourceAll(client: Client, dataSourceId: string): Promise<PipelineRow[]> {
  const rows: PipelineRow[] = [];
  let cursor: string | undefined;
  for (;;) {
    const res = await client.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: cursor,
    });
    for (const page of res.results) {
      if (!("properties" in page)) continue;
      const p = page as Record<string, unknown>;
      const props = unwrapProps(p);
      rows.push({
        pageId: p.id as string,
        title: titleFromProps(props),
        status: selectName(props, PROP.status),
        platform: selectName(props, PROP.platform),
        scheduledDate: dateStart(props, PROP.scheduledDate),
        hook: richProp(props, PROP.hook),
        script: richProp(props, PROP.script),
        repurposedOutputs: richProp(props, PROP.repurposedOutputs),
      });
    }
    if (!res.has_more || !res.next_cursor) break;
    cursor = res.next_cursor;
  }
  return rows;
}

export function rowPropertiesForNewIdea(item: CalendarItem): Record<string, unknown> {
  return {
    [PROP.title]: { title: rt(item.title) },
    [PROP.status]: { select: { name: "Idea" } },
    [PROP.platform]: { select: { name: item.platform } },
    [PROP.scheduledDate]: { date: { start: item.scheduledDate } },
  };
}

export function rowPropertiesDraft(hook: string, script: string): Record<string, unknown> {
  return {
    [PROP.hook]: { rich_text: toRichTextArray(hook) },
    [PROP.script]: { rich_text: toRichTextArray(script) },
    [PROP.status]: { select: { name: "Draft" } },
  };
}

export function rowPropertiesRepurposed(text: string): Record<string, unknown> {
  return {
    [PROP.repurposedOutputs]: { rich_text: toRichTextArray(text) },
    [PROP.status]: { select: { name: "Repurposed" } },
  };
}

export function rowPropertiesReady(): Record<string, unknown> {
  return {
    [PROP.status]: { select: { name: "Ready" } },
  };
}

export async function addPipelineRowsWithLog(
  client: Client,
  databaseId: string,
  items: CalendarItem[],
  onLog: (m: string) => void
): Promise<void> {
  for (const item of items) {
    onLog(`Writing to Notion: ${item.title}`);
    await client.pages.create({
      parent: { type: "database_id", database_id: databaseId },
      properties: rowPropertiesForNewIdea(item) as never,
    });
  }
}

export async function patchPage(
  client: Client,
  pageId: string,
  properties: Record<string, unknown>
): Promise<void> {
  await client.pages.update({
    page_id: pageId,
    properties: properties as never,
  });
}
