import MiniSearch from 'minisearch';
import type { Page } from '@/types';

interface IndexDoc {
  id: string;
  title: string;
  body: string;
}

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

export function buildIndex(pages: Page[]): MiniSearch<IndexDoc> {
  const mini = new MiniSearch<IndexDoc>({
    fields: ['title', 'body'],
    storeFields: ['title'],
    searchOptions: { boost: { title: 2 }, prefix: true, fuzzy: 0.2 },
  });
  const docs = pages
    .filter((p) => !p.trashed)
    .map<IndexDoc>((p) => ({
      id: p.id,
      title: p.title || 'Sans titre',
      body: extractText(p.content),
    }));
  mini.addAll(docs);
  return mini;
}
