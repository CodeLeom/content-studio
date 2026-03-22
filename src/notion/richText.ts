const MAX = 1900;

/** Notion rich_text text.content limit is 2000; split conservatively. */
export function toRichTextArray(plain: string): Array<{
  type: "text";
  text: { content: string };
}> {
  const chunks: string[] = [];
  let rest = plain;
  while (rest.length > 0) {
    chunks.push(rest.slice(0, MAX));
    rest = rest.slice(MAX);
  }
  if (chunks.length === 0) chunks.push("");
  return chunks.map((content) => ({
    type: "text" as const,
    text: { content },
  }));
}
