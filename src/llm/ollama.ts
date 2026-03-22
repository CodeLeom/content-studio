import { extractJson } from "../notion/parse.js";

const DEFAULT_HOST = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "llama3.1";

export function getOllamaModel(): string {
  return process.env.OLLAMA_MODEL?.trim() || DEFAULT_MODEL;
}

export function getOllamaHost(): string {
  return process.env.OLLAMA_HOST?.trim() || DEFAULT_HOST;
}

/** Chat completion with JSON mode (Ollama `format: json`). */
export async function ollamaJson(prompt: string): Promise<string> {
  const host = getOllamaHost().replace(/\/$/, "");
  const model = getOllamaModel();
  const res = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      stream: false,
      format: "json",
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Ollama HTTP ${res.status}: ${t}`);
  }
  const data = (await res.json()) as {
    message?: { content?: string };
  };
  const content = data.message?.content;
  if (!content) throw new Error("Ollama returned empty message.content");
  return content;
}

export async function ollamaJsonParsed<T>(prompt: string): Promise<T> {
  const raw = await ollamaJson(prompt);
  return extractJson<T>(raw);
}
