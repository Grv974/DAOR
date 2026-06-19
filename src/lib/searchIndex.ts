import MiniSearch from 'minisearch';
import type { Database, Page, Row } from '@/types';
import { extractText } from '@/lib/search';

// A single, long-lived search index kept in sync incrementally as pages and
// database rows change — rather than rebuilt on every search. Documents are
// either pages (`page:<id>`) or database rows (`row:<id>`); both resolve to a
// navigable page id so a hit always opens the right page.

export type SearchKind = 'page' | 'row';

interface IndexDoc {
  id: string;
  title: string;
  body: string;
  kind: SearchKind;
  pageId: string;
}

export interface SearchHit {
  id: string;
  title: string;
  kind: SearchKind;
  pageId: string;
}

const mini = new MiniSearch<IndexDoc>({
  fields: ['title', 'body'],
  storeFields: ['title', 'kind', 'pageId'],
  searchOptions: { boost: { title: 2 }, prefix: true, fuzzy: 0.2, combineWith: 'AND' },
});

const pageDocId = (id: string) => `page:${id}`;
const rowDocId = (id: string) => `row:${id}`;

function put(doc: IndexDoc) {
  if (mini.has(doc.id)) mini.replace(doc);
  else mini.add(doc);
}

function drop(id: string) {
  if (mini.has(id)) mini.discard(id);
}

/** Build a row's searchable text from its values (incl. select option names). */
function rowText(db: Database, row: Row): { title: string; body: string } {
  const parts: string[] = [];
  let title = '';
  for (const prop of db.properties) {
    const v = row.values[prop.id];
    if (v === null || v === undefined || v === '') continue;
    if (prop.type === 'select' || prop.type === 'multiselect') {
      const ids = Array.isArray(v) ? (v as string[]) : [v as string];
      const names = (prop.options ?? [])
        .filter((o) => ids.includes(o.id))
        .map((o) => o.name);
      parts.push(...names);
    } else if (prop.type === 'checkbox') {
      if (v) parts.push(prop.name);
    } else {
      parts.push(String(v));
      if (prop.id === db.titlePropId) title = String(v);
    }
  }
  return { title: title || 'Ligne sans titre', body: parts.join(' ') };
}

export const searchIndex = {
  upsertPage(page: Page) {
    if (page.trashed) {
      drop(pageDocId(page.id));
      return;
    }
    put({
      id: pageDocId(page.id),
      title: page.title || 'Sans titre',
      body: extractText(page.content),
      kind: 'page',
      pageId: page.id,
    });
  },

  removePage(id: string) {
    drop(pageDocId(id));
  },

  upsertRow(db: Database, row: Row) {
    const { title, body } = rowText(db, row);
    put({ id: rowDocId(row.id), title, body, kind: 'row', pageId: db.id });
  },

  removeRow(rowId: string) {
    drop(rowDocId(rowId));
  },

  /** Full (re)build from current data. Safe to call multiple times. */
  buildAll(pages: Page[], databases: Record<string, Database>, rows: Row[]) {
    mini.removeAll();
    for (const p of pages) {
      if (!p.trashed) {
        mini.add({
          id: pageDocId(p.id),
          title: p.title || 'Sans titre',
          body: extractText(p.content),
          kind: 'page',
          pageId: p.id,
        });
      }
    }
    for (const row of rows) {
      const db = databases[row.databaseId];
      if (!db) continue;
      const { title, body } = rowText(db, row);
      mini.add({ id: rowDocId(row.id), title, body, kind: 'row', pageId: db.id });
    }
  },

  search(query: string): SearchHit[] {
    return mini.search(query).map((r) => ({
      id: r.id as string,
      title: (r as unknown as { title: string }).title,
      kind: (r as unknown as { kind: SearchKind }).kind,
      pageId: (r as unknown as { pageId: string }).pageId,
    }));
  },
};
