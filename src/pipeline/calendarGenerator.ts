import { tonesForPrompt } from "../lib/creatorProfile";
import type { CalendarItem, CreatorProfile } from "../types";
import { ollamaJsonParsed } from "../llm/ollama";

export function postCountForWeek(postingFrequency: string): number {
  const m = postingFrequency.match(/(\d+)/);
  const raw = m ? parseInt(m[1], 10) : 3;
  return Math.min(7, Math.max(1, raw));
}

/**
 * Latest scheduled date in the pipeline (YYYY-MM-DD). Used when appending new ideas
 * so dates continue after existing rows.
 */
export function maxScheduledDateIso(rows: Array<{ scheduledDate?: string }>): string | undefined {
  let max = "";
  for (const r of rows) {
    const d = r.scheduledDate?.trim();
    if (!d) continue;
    if (!max || d > max) max = d;
  }
  return max || undefined;
}

/**
 * One scheduled post per calendar day. Without `lastScheduledDayIso`, starts tomorrow.
 * With `lastScheduledDayIso`, the first new day is the day after that (append batch).
 */
export function scheduleDatesForPlan(count: number, lastScheduledDayIso?: string): string[] {
  const n = Math.min(90, Math.max(1, count));
  let start: Date;
  if (lastScheduledDayIso) {
    const parsed = new Date(lastScheduledDayIso.trim() + "T12:00:00");
    if (Number.isNaN(parsed.getTime())) {
      start = new Date();
      start.setDate(start.getDate() + 1);
    } else {
      start = new Date(parsed);
      start.setDate(start.getDate() + 1);
    }
  } else {
    start = new Date();
    start.setDate(start.getDate() + 1);
  }
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export function calendarPostCountForProfile(profile: CreatorProfile): number {
  const c = profile.calendarPostCount;
  if (typeof c === "number" && Number.isFinite(c) && c >= 1) {
    return Math.min(90, Math.max(1, Math.floor(c)));
  }
  return postCountForWeek(profile.postingFrequency);
}

export function rotatePlatforms(platforms: string[], n: number): string[] {
  const p = platforms.length ? platforms : ["YouTube"];
  return Array.from({ length: n }, (_, i) => p[i % p.length]);
}

export async function generateWeeklyCalendar(
  profile: CreatorProfile,
  opts?: { lastScheduledDayIso?: string }
): Promise<CalendarItem[]> {
  const n = calendarPostCountForProfile(profile);
  const dates = scheduleDatesForPlan(n, opts?.lastScheduledDayIso);
  const platforms = rotatePlatforms(profile.platforms, n);
  const prompt = `Return ONLY valid JSON: {"titles": string[]}
The array must have exactly ${n} items.

Generate ${n} specific, compelling content titles for a creator in niche: "${profile.niche}".
Each title should match the intended platform in the batch when platforms rotate: ${profile.platforms.join(", ") || "general"}.
Style: ${profile.contentStyle}. Tone: ${tonesForPrompt(profile)}.
Titles should feel actionable and on-brand. No numbering in titles.`;
  const parsed = await ollamaJsonParsed<{ titles: string[] }>(prompt);
  let titles = parsed.titles ?? [];
  if (titles.length < n) {
    while (titles.length < n) {
      titles.push(`${profile.niche} tip #${titles.length + 1}`);
    }
  }
  if (titles.length > n) titles = titles.slice(0, n);
  return titles.map((title, i) => ({
    title,
    platform: platforms[i] ?? platforms[0] ?? "YouTube",
    scheduledDate: dates[i] ?? dates[dates.length - 1],
  }));
}
