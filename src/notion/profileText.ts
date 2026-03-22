import { DEFAULT_TONES } from "../lib/creatorProfile";
import type { CreatorProfile } from "../types";

export function formatCreatorProfileBody(p: CreatorProfile): string {
  const toneLine =
    p.tones.length > 0 ? p.tones.join(", ") : `${DEFAULT_TONES.join(", ")} (recommended)`;
  return [
    `Platforms: ${p.platforms.join(", ")}`,
    `Niche: ${p.niche}`,
    `Posting frequency: ${p.postingFrequency}`,
    `Content style: ${p.contentStyle}`,
    `Tone: ${toneLine}`,
  ].join("\n");
}

export function parseCreatorProfileBody(text: string): CreatorProfile | null {
  const platformsLine = text.match(/Platforms:\s*(.+)/i);
  const nicheLine = text.match(/Niche:\s*(.+)/i);
  const freqLine = text.match(/Posting frequency:\s*(.+)/i);
  const styleLine = text.match(/Content style:\s*(.+)/i);
  const toneLine = text.match(/Tone:\s*(.+)/i);
  if (!platformsLine || !nicheLine || !freqLine || !styleLine || !toneLine) return null;
  const rawTone = toneLine[1].trim();
  const recommended = /\s*\(recommended\)\s*$/i.test(rawTone);
  const toneClean = rawTone.replace(/\s*\(recommended\)\s*$/i, "").trim();
  const tones = recommended ? [] : toneClean.split(",").map((s) => s.trim()).filter(Boolean);
  return {
    platforms: platformsLine[1].split(",").map((s) => s.trim()).filter(Boolean),
    niche: nicheLine[1].trim(),
    postingFrequency: freqLine[1].trim(),
    contentStyle: styleLine[1].trim(),
    tones,
  };
}
