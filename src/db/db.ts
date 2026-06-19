import Dexie, { type Table } from 'dexie';
import type { Database, FileBlob, Page, Row } from '@/types';
import type { Commitment, Entity, Interaction, Relation } from '@/types/aura';

// Single IndexedDB database for the whole workspace.
// Pages and file blobs live in separate stores so that large binary
// uploads never force a rewrite of page documents.
export class DaorDB extends Dexie {
  pages!: Table<Page, string>;
  files!: Table<FileBlob, string>;
  databases!: Table<Database, string>;
  rows!: Table<Row, string>;
  // AURA layer.
  entities!: Table<Entity, string>;
  relations!: Table<Relation, string>;
  commitments!: Table<Commitment, string>;
  interactions!: Table<Interaction, string>;

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
    // v3 adds the AURA entity + relations engine.
    this.version(3).stores({
      pages: 'id, parentId, favorite, trashed, updatedAt',
      files: 'id, createdAt',
      databases: 'id',
      rows: 'id, databaseId, order',
      entities: 'id, type, updatedAt, archived',
      relations: 'id, source, target, type, [source+type], [target+type]',
      commitments: 'id, contactId, done',
      interactions: 'id, contactId, date',
    });
  }
}

export const db = new DaorDB();
