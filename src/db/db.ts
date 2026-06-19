import Dexie, { type Table } from 'dexie';
import type { Database, FileBlob, Page, Row } from '@/types';

// Single IndexedDB database for the whole workspace.
// Pages and file blobs live in separate stores so that large binary
// uploads never force a rewrite of page documents.
export class DaorDB extends Dexie {
  pages!: Table<Page, string>;
  files!: Table<FileBlob, string>;
  databases!: Table<Database, string>;
  rows!: Table<Row, string>;

  constructor() {
    super('daor');
    this.version(1).stores({
      // Indexes chosen to support tree queries, favorites and trash views.
      pages: 'id, parentId, favorite, trashed, updatedAt',
      files: 'id, createdAt',
    });
    // v2 adds local databases (schema) and their rows.
    this.version(2).stores({
      pages: 'id, parentId, favorite, trashed, updatedAt',
      files: 'id, createdAt',
      databases: 'id',
      rows: 'id, databaseId, order',
    });
  }
}

export const db = new DaorDB();
