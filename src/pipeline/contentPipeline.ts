import type { Client } from "@notionhq/client";
import type { CreatorProfile, PipelineRow } from "../types";
import {
  patchPage,
  queryDataSourceAll,
  rowPropertiesDraft,
  rowPropertiesReady,
  rowPropertiesRepurposed,
} from "../lib/notionRest";
import { generateScript } from "../llm/scriptGenerator";
import { formatRepurposedForNotion, generateRepurposedContent } from "../llm/repurposer";

function hasScript(row: PipelineRow): boolean {
  return Boolean(row.script && row.script.trim().length > 0);
}

export async function runContentPipeline(
  client: Client,
  dataSourceId: string,
  profile: CreatorProfile,
  options: { force: boolean },
  onLog: (m: string) => void
): Promise<void> {
  const rows = await queryDataSourceAll(client, dataSourceId);
  const ideas = rows.filter((r) => r.status === "Idea");
  onLog(`Found ${ideas.length} ideas (total rows: ${rows.length})`);

  for (const row of ideas) {
    try {
      if (!options.force && hasScript(row)) {
        onLog(`Skipping "${row.title}" — already has script (use force to regenerate)`);
        continue;
      }
      onLog(`Generating script for: ${row.title}`);
      const scriptOut = await generateScript({
        title: row.title,
        platform: row.platform,
        profile,
      });
      onLog("Writing to Notion (hook + script, status → Draft)");
      await patchPage(client, row.pageId, rowPropertiesDraft(scriptOut.hook, scriptOut.script));

      onLog("Repurposing content");
      const rep = await generateRepurposedContent(scriptOut.script, profile);
      const blob = formatRepurposedForNotion(rep);
      onLog("Writing repurposed outputs to Notion");
      await patchPage(client, row.pageId, rowPropertiesRepurposed(blob));
      onLog("Marking Ready");
      await patchPage(client, row.pageId, rowPropertiesReady());
      onLog(`Completed item: ${row.title}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      onLog(`ERROR row "${row.title}": ${msg}`);
    }
  }
}
