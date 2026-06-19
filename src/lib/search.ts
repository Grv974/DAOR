/** Recursively extract plain text from a Tiptap/ProseMirror JSON document. */
export function extractText(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const node = content as { text?: string; content?: unknown[] };
  let out = node.text ? node.text + ' ' : '';
  if (Array.isArray(node.content)) {
    for (const child of node.content) out += extractText(child);
  }
  return out;
}
