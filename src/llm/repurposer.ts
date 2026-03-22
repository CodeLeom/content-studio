import { tonesForPrompt } from "../lib/creatorProfile";
import type { CreatorProfile } from "../types";
import { ollamaJsonParsed } from "./ollama";

export type RepurposedContent = {
  xPosts: string[];
  linkedinPost: string;
  shortForm: { hook: string; outline: string };
  carouselSlides: string[];
};

function safeStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => safeStr(x)).join("\n");
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

/** Remove common markdown so Notion shows clean text. */
export function stripMarkdownLight(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^[-*]\s+/gm, "• ")
    .trim();
}

function normalizeRepurposed(raw: Partial<RepurposedContent>): RepurposedContent {
  const sf = raw.shortForm ?? { hook: "", outline: "" };
  const outlineRaw = sf.outline as unknown;
  const outlineStr =
    typeof outlineRaw === "string"
      ? outlineRaw
      : Array.isArray(outlineRaw)
        ? outlineRaw.map((x) => safeStr(x)).join("\n")
        : safeStr(outlineRaw);

  return {
    xPosts: Array.isArray(raw.xPosts) ? raw.xPosts.map((x) => safeStr(x)) : [],
    linkedinPost: safeStr(raw.linkedinPost),
    shortForm: {
      hook: safeStr(sf.hook),
      outline: outlineStr,
    },
    carouselSlides: Array.isArray(raw.carouselSlides)
      ? raw.carouselSlides.map((x) => safeStr(x))
      : [],
  };
}

export async function generateRepurposedContent(
  script: string,
  profile: CreatorProfile,
  targetPlatform: string
): Promise<RepurposedContent> {
  const primary = (targetPlatform || "General").trim();
  const prompt = `You are a social repurposing assistant. Respond with ONLY valid JSON (no markdown fences) matching this shape:
{"xPosts": string[3], "linkedinPost": string, "shortForm": {"hook": string, "outline": string}, "carouselSlides": string[5]}

Original script:
---
${script}
---

PRIMARY CHANNEL for this post (treat as the main destination; weight quality here): "${primary}"
Creator tone: ${tonesForPrompt(profile)}. Style: ${profile.contentStyle}. Niche: ${profile.niche}.

Rules:
- All string values must be plain text only: NO markdown headers (#), NO **bold**, NO bullet markdown — use plain sentences or lines only.
- shortForm.outline MUST be a single STRING (e.g. line breaks between ideas), never an object or array.
- If PRIMARY is Instagram: make carouselSlides the strongest (5 slide lines); fill shortForm hook+outline for Reels; xPosts can be short teasers.
- If PRIMARY is X or Twitter: make xPosts the strongest (3 posts under ~280 chars when possible).
- If PRIMARY is LinkedIn: make linkedinPost the strongest (professional paragraphs).
- If PRIMARY is TikTok, YouTube Shorts, or Reels: prioritize shortForm.hook and shortForm.outline.
- If PRIMARY is YouTube (long): balance linkedinPost + carousel for cross-promo; still fill all fields with useful plain text.`;

  const raw = await ollamaJsonParsed<RepurposedContent>(prompt);
  return normalizeRepurposed(raw ?? {});
}

/**
 * Plain-text sections for Notion. Puts the row's platform first; no markdown headers.
 */
export function formatRepurposedForNotion(r: RepurposedContent, targetPlatform: string): string {
  const tp = stripMarkdownLight(targetPlatform || "General");
  const pl = tp.toLowerCase();

  const xBlock = r.xPosts.map((p, i) => `Post ${i + 1}: ${stripMarkdownLight(p)}`).join("\n\n");
  const slides = r.carouselSlides.map((s, i) => `Slide ${i + 1}: ${stripMarkdownLight(s)}`).join("\n");
  const li = stripMarkdownLight(r.linkedinPost);
  const hook = stripMarkdownLight(r.shortForm.hook);
  const outline = stripMarkdownLight(r.shortForm.outline);

  const instagramBlock = [slides, hook && `Hook: ${hook}`, outline && `Outline:\n${outline}`].filter(Boolean).join("\n\n");
  const shortBlock = [hook && `Hook: ${hook}`, outline && `Outline:\n${outline}`].filter(Boolean).join("\n\n");

  type Block = { label: string; body: string };
  const blocks: Block[] = [];

  const pushPrimary = (label: string, body: string) => {
    const b = body.trim();
    if (b) blocks.push({ label: `Primary — ${label}`, body: b });
  };
  const pushExtra = (label: string, body: string) => {
    const b = body.trim();
    if (b) blocks.push({ label, body: b });
  };

  const isInsta = pl.includes("instagram");
  const isX = pl === "x" || pl.includes("twitter");
  const isLinked = pl.includes("linkedin");
  const isShort =
    pl.includes("tiktok") ||
    pl.includes("short") ||
    pl.includes("reels") ||
    pl.includes("youtube");

  if (isInsta) {
    pushPrimary("Instagram", instagramBlock || slides || shortBlock);
    if (xBlock) pushExtra("X (Twitter)", xBlock);
    if (li) pushExtra("LinkedIn", li);
  } else if (isX) {
    pushPrimary("X (Twitter)", xBlock);
    if (instagramBlock) pushExtra("Instagram", instagramBlock);
    if (li) pushExtra("LinkedIn", li);
    if (shortBlock) pushExtra("Short-form video", shortBlock);
  } else if (isLinked) {
    pushPrimary("LinkedIn", li);
    if (xBlock) pushExtra("X (Twitter)", xBlock);
    if (instagramBlock) pushExtra("Instagram", instagramBlock);
    if (shortBlock) pushExtra("Short-form video", shortBlock);
  } else if (isShort) {
    pushPrimary("Short-form video", shortBlock || hook + "\n" + outline);
    if (xBlock) pushExtra("X (Twitter)", xBlock);
    if (instagramBlock) pushExtra("Instagram", instagramBlock);
    if (li) pushExtra("LinkedIn", li);
  } else {
    pushPrimary(tp, [instagramBlock, xBlock, li, shortBlock].filter(Boolean).join("\n\n"));
  }

  // De-dupe empty and format as plain sections (title line + body, no ###)
  return blocks
    .map((b) => `${b.label}\n${b.body}`)
    .join("\n\n—\n\n");
}
