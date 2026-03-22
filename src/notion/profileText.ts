import type { CreatorProfile } from "../types.js";

export function formatCreatorProfileBody(p: CreatorProfile): string {
  return [
    `Platforms: ${p.platforms.join(", ")}`,
    `Niche: ${p.niche}`,
    `Posting frequency: ${p.postingFrequency}`,
    `Content style: ${p.contentStyle}`,
    `Tone: ${p.tone}`,
  ].join("\n");
}

export function parseCreatorProfileBody(text: string): CreatorProfile | null {
  const platformsLine = text.match(/Platforms:\s*(.+)/i);
  const nicheLine = text.match(/Niche:\s*(.+)/i);
  const freqLine = text.match(/Posting frequency:\s*(.+)/i);
  const styleLine = text.match(/Content style:\s*(.+)/i);
  const toneLine = text.match(/Tone:\s*(.+)/i);
  if (!platformsLine || !nicheLine || !freqLine || !styleLine || !toneLine) return null;
  return {
    platforms: platformsLine[1].split(",").map((s) => s.trim()).filter(Boolean),
    niche: nicheLine[1].trim(),
    postingFrequency: freqLine[1].trim(),
    contentStyle: styleLine[1].trim(),
    tone: toneLine[1].trim(),
  };
}
