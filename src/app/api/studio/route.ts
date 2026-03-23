import { NextResponse } from "next/server";
import type { CreatorProfile } from "@/types";
import type { StudioState } from "@/state";
import { generateWeeklyCalendar, maxScheduledDateIso } from "@/pipeline/calendarGenerator";
import { runContentPipeline } from "@/pipeline/contentPipeline";
import { getNotionAccessToken } from "@/lib/notionSession";
import { queryDataSourceAll } from "@/lib/notionRest";
import { sanitizeStudioState } from "@/lib/notionStateSanitize";
import {
  ensureContentPipeline,
  ensureCreatorProfile,
  ensureHub,
  getClientForRequest,
  isPipelineEmpty,
  loadProfileFromNotion,
  seedCalendar,
} from "@/lib/webOrchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  action: "setup" | "calendar" | "pipeline" | "run-all";
  state?: StudioState;
  profile?: CreatorProfile;
  force?: boolean;
  /** Clear client-sent IDs before sanitizing (after you deleted the hub in Notion). */
  reset?: boolean;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  const token = await getNotionAccessToken();
  if (!token) {
    return jsonError(
      "Notion is not connected. Use Connect Notion on the home page, or set NOTION_TOKEN for server-only development.",
      401
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonError("Invalid JSON body");
  }

  const client = getClientForRequest(token);
  const logs: string[] = [];
  const log = (m: string) => logs.push(m);

  let state: StudioState = body.reset ? {} : (body.state ?? {});

  try {
    if (body.reset) {
      log("Cleared saved Notion IDs from the request.");
    }
    state = await sanitizeStudioState(client, state, log);

    switch (body.action) {
      case "setup": {
        if (!body.profile) return jsonError("profile is required for setup");
        state = await ensureHub(client, state);
        log(state.hubPageId ? "Hub ready" : "Hub missing");
        state = await ensureCreatorProfile(client, state, body.profile, true);
        state = await ensureContentPipeline(client, state);
        log("Setup complete — Creator Profile and Content Pipeline are in Notion.");
        return NextResponse.json({ ok: true, state, logs });
      }
      case "calendar": {
        state = await ensureHub(client, state);
        state = await ensureContentPipeline(client, state);
        const profile =
          body.profile ?? (await loadProfileFromNotion(client, state));
        if (!profile) return jsonError("No profile — run setup first or send profile in body");
        if (!state.contentPipelineDatabaseId || !state.contentPipelineDataSourceId) {
          return jsonError("Content Pipeline not configured");
        }
        const rows = await queryDataSourceAll(client, state.contentPipelineDataSourceId);
        const lastDay = maxScheduledDateIso(rows);
        log("Generating calendar (LLM)…");
        const items = await generateWeeklyCalendar(profile, { lastScheduledDayIso: lastDay });
        log(
          lastDay
            ? `Appending ${items.length} new ideas (dates continue after ${lastDay}).`
            : `Adding ${items.length} new ideas (one per day from tomorrow).`
        );
        await seedCalendar(client, state.contentPipelineDatabaseId, items, log);
        log("Calendar written (Status = Idea).");
        return NextResponse.json({ ok: true, state, logs });
      }
      case "pipeline": {
        state = await ensureHub(client, state);
        state = await ensureContentPipeline(client, state);
        const profile =
          body.profile ?? (await loadProfileFromNotion(client, state));
        if (!profile) return jsonError("No profile — run setup first");
        if (!state.contentPipelineDataSourceId) {
          return jsonError("Missing data source id");
        }
        await runContentPipeline(
          client,
          state.contentPipelineDataSourceId,
          profile,
          { force: Boolean(body.force) },
          log
        );
        return NextResponse.json({ ok: true, state, logs });
      }
      case "run-all": {
        state = await ensureHub(client, state);
        const profile = body.profile ?? (await loadProfileFromNotion(client, state));
        if (!profile) return jsonError("No profile — fill the form and run again");
        state = await ensureCreatorProfile(client, state, profile, true);
        state = await ensureContentPipeline(client, state);
        if (!state.contentPipelineDatabaseId || !state.contentPipelineDataSourceId) {
          return jsonError("Could not resolve Content Pipeline");
        }
        const empty = await isPipelineEmpty(client, state.contentPipelineDataSourceId);
        if (empty) {
          log("Pipeline empty — generating calendar…");
          const items = await generateWeeklyCalendar(profile);
          await seedCalendar(client, state.contentPipelineDatabaseId, items, log);
        } else {
          log(
            "Calendar skipped — pipeline already has rows (use “Generate calendar” alone to append more ideas)."
          );
        }
        await runContentPipeline(
          client,
          state.contentPipelineDataSourceId,
          profile,
          { force: Boolean(body.force) },
          log
        );
        log("run-all finished.");
        return NextResponse.json({ ok: true, state, logs });
      }
      default:
        return jsonError("Unknown action");
    }
  } catch (e) {
    let msg = e instanceof Error ? e.message : String(e);
    if (/archived ancestor/i.test(msg)) {
      msg +=
        " Unarchive the parent page in Notion, or set NOTION_PARENT_PAGE_ID to a live page shared with the integration. Then use “Clear saved Notion IDs” in the app and run Setup again.";
    }
    logs.push(`ERROR: ${msg}`);
    return NextResponse.json({ ok: false, state, logs, error: msg }, { status: 500 });
  }
}
