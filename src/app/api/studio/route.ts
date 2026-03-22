import { NextResponse } from "next/server";
import type { CreatorProfile } from "@/types";
import type { StudioState } from "@/state";
import { generateWeeklyCalendar } from "@/pipeline/calendarGenerator";
import { runContentPipeline } from "@/pipeline/contentPipeline";
import { getNotionAccessToken } from "@/lib/notionSession";
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

  let state: StudioState = body.state ?? {};

  try {
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
        const empty = await isPipelineEmpty(client, state.contentPipelineDataSourceId);
        if (!empty) {
          log(
            "Pipeline already has rows — skipped calendar (not deleted, not appended). Clear Idea rows in Notion for a fresh batch."
          );
          return NextResponse.json({ ok: true, state, logs });
        }
        log("Generating calendar (LLM)…");
        const items = await generateWeeklyCalendar(profile);
        log(`Scheduling ${items.length} posts`);
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
          log("Calendar skipped — pipeline already has rows (clear Idea rows to regenerate).");
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
    const msg = e instanceof Error ? e.message : String(e);
    logs.push(`ERROR: ${msg}`);
    return NextResponse.json({ ok: false, state, logs, error: msg }, { status: 500 });
  }
}
