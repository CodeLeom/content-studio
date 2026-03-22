/** Extract JSON object/array from MCP tool text (often markdown + JSON). */
export function extractJson<T>(text: string): T {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1].trim() : trimmed;
  const startObj = candidate.indexOf("{");
  const startArr = candidate.indexOf("[");
  let start = -1;
  if (startObj === -1) start = startArr;
  else if (startArr === -1) start = startObj;
  else start = Math.min(startObj, startArr);
  if (start < 0) throw new Error("No JSON found in model response");
  const slice = candidate.slice(start);
  return JSON.parse(slice) as T;
}

/** Parse JSON returned by Notion MCP OpenAPI tools (may include prose). */
export function parseMcpJson(text: string): unknown {
  try {
    return JSON.parse(text.trim());
  } catch {
    try {
      return extractJson(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("No JSON object in MCP response");
      return JSON.parse(m[0]);
    }
  }
}
