import { tonesForPrompt } from "../lib/creatorProfile.js";
import type { CreatorProfile } from "../types.js";
import { ollamaJsonParsed } from "./ollama.js";

export type RepurposedContent = {
  xPosts: string[];
  linkedinPost: string;
  shortForm: { hook: string; outline: string };
  carouselSlides: string[];
};

export async function generateRepurposedContent(
  script: string,
  profile: CreatorProfile
): Promise<RepurposedContent> {
  const prompt = `You are a social repurposing assistant. Respond with ONLY valid JSON (no markdown fences) matching this shape:
{"xPosts": string[3], "linkedinPost": string, "shortForm": {"hook": string, "outline": string}, "carouselSlides": string[5]}

Original script to repurpose:
---
${script}
---

Creator tone: ${tonesForPrompt(profile)}. Style: ${profile.contentStyle}. Niche: ${profile.niche}.

Rules:
- xPosts: exactly 3 distinct posts for X/Twitter (under 280 chars each if possible).
- linkedinPost: one professional post (short paragraphs).
- shortForm: one hook + bullet outline for TikTok/Reels style.
- carouselSlides: exactly 5 short slide texts for an Instagram/LinkedIn carousel.`;

  return ollamaJsonParsed<RepurposedContent>(prompt);
}

export function formatRepurposedForNotion(r: RepurposedContent): string {
  const x = r.xPosts.map((p, i) => `Post ${i + 1}: ${p}`).join("\n\n");
  const slides = r.carouselSlides.map((s, i) => `Slide ${i + 1}: ${s}`).join("\n");
  return [
    "### X (Twitter)",
    x,
    "### LinkedIn",
    r.linkedinPost,
    "### Short-form video",
    `Hook: ${r.shortForm.hook}`,
    `Outline:\n${r.shortForm.outline}`,
    "### 5-slide carousel",
    slides,
  ].join("\n\n");
}
