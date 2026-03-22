import { tonesForPrompt } from "../lib/creatorProfile";
import type { CalendarItem, CreatorProfile } from "../types";
import { ollamaJsonParsed } from "../llm/ollama";

export function postCountForWeek(postingFrequency: string): number {
  const m = postingFrequency.match(/(\d+)/);
  const raw = m ? parseInt(m[1], 10) : 3;
  return Math.min(7, Math.max(1, raw));
}

/** One scheduled post per calendar day, starting tomorrow (supports 30-day plans, etc.). */
export function scheduleDatesForPlan(count: number): string[] {
  const n = Math.min(90, Math.max(1, count));
  const start = new Date();
  start.setDate(start.getDate() + 1);
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

export async function generateWeeklyCalendar(profile: CreatorProfile): Promise<CalendarItem[]> {
  const n = calendarPostCountForProfile(profile);
  const dates = scheduleDatesForPlan(n);
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
