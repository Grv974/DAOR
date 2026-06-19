import Dexie, { type Table } from 'dexie';
import type { FileBlob, Page } from '@/types';

// Single IndexedDB database for the whole workspace.
// Pages and file blobs live in separate stores so that large binary
// uploads never force a rewrite of page documents.
export class DaorDB extends Dexie {
  pages!: Table<Page, string>;
  files!: Table<FileBlob, string>;

  constructor() {
    super('daor');
    this.version(1).stores({
      // Indexes chosen to support tree queries, favorites and trash views.
      pages: 'id, parentId, favorite, trashed, updatedAt',
      files: 'id, createdAt',
    });
  }
}

export const db = new DaorDB();
