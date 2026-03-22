import type { CalendarItem, CreatorProfile } from "../types.js";
import { ollamaJsonParsed } from "../llm/ollama.js";

export function postCountForWeek(postingFrequency: string): number {
  const m = postingFrequency.match(/(\d+)/);
  const raw = m ? parseInt(m[1], 10) : 3;
  return Math.min(5, Math.max(3, raw));
}

function dayOffsets(count: number): number[] {
  if (count <= 1) return [0];
  return Array.from({ length: count }, (_, i) => Math.round((i * 6) / (count - 1)));
}

export function scheduleDatesInWeek(count: number): string[] {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  const offsets = dayOffsets(count);
  return offsets.map((off) => {
    const d = new Date(start);
    d.setDate(start.getDate() + off);
    return d.toISOString().slice(0, 10);
  });
}

export function rotatePlatforms(platforms: string[], n: number): string[] {
  const p = platforms.length ? platforms : ["YouTube"];
  return Array.from({ length: n }, (_, i) => p[i % p.length]);
}

export async function generateWeeklyCalendar(profile: CreatorProfile): Promise<CalendarItem[]> {
  const n = postCountForWeek(profile.postingFrequency);
  const dates = scheduleDatesInWeek(n);
  const platforms = rotatePlatforms(profile.platforms, n);
  const prompt = `Return ONLY valid JSON: {"titles": string[]}
The array must have exactly ${n} items.

Generate ${n} specific, compelling content titles for a creator in niche: "${profile.niche}".
Style: ${profile.contentStyle}. Tone: ${profile.tone}.
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
