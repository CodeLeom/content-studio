import { tonesForPrompt } from "../lib/creatorProfile";
import type { CreatorProfile } from "../types";
import { ollamaJsonParsed } from "./ollama";

export type ScriptInput = {
  title: string;
  platform: string;
  profile: CreatorProfile;
};

export type ScriptOutput = {
  hook: string;
  script: string;
  keyPoints: string[];
};

export async function generateScript(input: ScriptInput): Promise<ScriptOutput> {
  const prompt = `You are a short-form content writer. Respond with ONLY valid JSON (no markdown fences) matching this shape:
{"hook": string, "script": string, "keyPoints": string[]}

Topic/title: ${input.title}
Target platform: ${input.platform}
Creator niche: ${input.profile.niche}
Content style: ${input.profile.contentStyle}
Tone: ${tonesForPrompt(input.profile)}
Platforms they use: ${input.profile.platforms.join(", ")}

Write a hook (1-2 sentences), a full script suitable for ${input.platform} (under ~400 words unless platform needs shorter), and 3-6 key bullet points.`;
  return ollamaJsonParsed<ScriptOutput>(prompt);
}
