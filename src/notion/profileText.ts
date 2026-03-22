import { DEFAULT_TONES } from "../lib/creatorProfile";
import type { CreatorProfile } from "../types";

export function formatCreatorProfileBody(p: CreatorProfile): string {
  const toneLine =
    p.tones.length > 0 ? p.tones.join(", ") : `${DEFAULT_TONES.join(", ")} (recommended)`;
  return [
    `Platforms: ${p.platforms.join(", ")}`,
    `Niche: ${p.niche}`,
    `Posting frequency: ${p.postingFrequency}`,
    `Calendar post count: ${p.calendarPostCount}`,
    `Content style: ${p.contentStyle}`,
    `Tone: ${toneLine}`,
  ].join("\n");
}

export function parseCreatorProfileBody(text: string): CreatorProfile | null {
  const platformsLine = text.match(/Platforms:\s*(.+)/i);
  const nicheLine = text.match(/Niche:\s*(.+)/i);
  const freqLine = text.match(/Posting frequency:\s*(.+)/i);
  const countLine = text.match(/Calendar post count:\s*(\d+)/i);
  const styleLine = text.match(/Content style:\s*(.+)/i);
  const toneLine = text.match(/Tone:\s*(.+)/i);
  if (!platformsLine || !nicheLine || !freqLine || !styleLine || !toneLine) return null;
  const rawTone = toneLine[1].trim();
  const recommended = /\s*\(recommended\)\s*$/i.test(rawTone);
  const toneClean = rawTone.replace(/\s*\(recommended\)\s*$/i, "").trim();
  const tones = recommended ? [] : toneClean.split(",").map((s) => s.trim()).filter(Boolean);
  let calendarPostCount = countLine ? parseInt(countLine[1], 10) : NaN;
  if (!Number.isFinite(calendarPostCount) || calendarPostCount < 1) {
    const m = freqLine[1].match(/(\d+)/);
    calendarPostCount = m ? Math.min(90, Math.max(1, parseInt(m[1], 10))) : 7;
  }
  calendarPostCount = Math.min(90, Math.max(1, calendarPostCount));

  return {
    platforms: platformsLine[1].split(",").map((s) => s.trim()).filter(Boolean),
    niche: nicheLine[1].trim(),
    postingFrequency: freqLine[1].trim(),
    calendarPostCount,
    contentStyle: styleLine[1].trim(),
    tones,
  };
}
