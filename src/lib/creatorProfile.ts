import type { CreatorProfile } from "../types";

export const DEFAULT_TONES = ["casual", "friendly"] as const;

export const PLATFORM_OPTIONS = [
  { id: "x", label: "X" },
  { id: "tiktok", label: "TikTok" },
  { id: "facebook", label: "Facebook" },
  { id: "youtube", label: "YouTube" },
  { id: "instagram", label: "Instagram" },
  { id: "other", label: "Other" },
] as const;

export type PlatformId = (typeof PLATFORM_OPTIONS)[number]["id"];

export const TONE_OPTIONS = [
  "casual",
  "friendly",
  "professional",
  "humorous",
  "inspirational",
  "authoritative",
  "conversational",
  "educational",
] as const;

/** Values must include a digit for `postCountForWeek` (e.g. 3 in 3x/week). */
export const POSTING_FREQUENCY_OPTIONS = [
  { value: "7x/week", label: "Daily (~7× per week)" },
  { value: "5x/week", label: "5× per week" },
  { value: "4x/week", label: "4× per week" },
  { value: "3x/week", label: "3× per week" },
  { value: "2x/week", label: "2× per week" },
  { value: "1x/week", label: "1× per week" },
] as const;

export const CONTENT_STYLE_OPTIONS = [
  "educational",
  "entertainment",
  "storytelling",
  "how-to / tutorials",
  "news & commentary",
  "lifestyle",
  "documentary",
  "behind-the-scenes",
] as const;

export function tonesForPrompt(profile: CreatorProfile): string {
  const t = profile.tones.length > 0 ? profile.tones : [...DEFAULT_TONES];
  return t.join(", ");
}

export function buildPlatformsFromSelection(selectedIds: Set<string>, otherText: string): string[] {
  const out: string[] = [];
  for (const opt of PLATFORM_OPTIONS) {
    if (opt.id === "other") continue;
    if (selectedIds.has(opt.id)) out.push(opt.label);
  }
  if (selectedIds.has("other")) {
    const t = otherText.trim();
    if (t) out.push(t);
  }
  return out;
}

export function selectionFromPlatforms(platforms: string[]): { selectedIds: Set<string>; otherText: string } {
  const selectedIds = new Set<string>();
  const labelsById = new Map(PLATFORM_OPTIONS.filter((o) => o.id !== "other").map((o) => [o.label.toLowerCase(), o.id]));
  let otherText = "";

  for (const raw of platforms) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const id = labelsById.get(trimmed.toLowerCase());
    if (id) selectedIds.add(id);
    else {
      selectedIds.add("other");
      otherText = trimmed;
    }
  }

  return { selectedIds, otherText };
}
