import { create } from 'zustand';
import { db } from '@/db/db';
import type { Database, PropertyDef, PropertyType, Row, SelectOption } from '@/types';
import { newId } from '@/lib/id';
import { pickColor } from '@/lib/colors';

interface DatabaseState {
  databases: Record<string, Database>;
  /** Rows grouped by database id; loaded lazily when a database is opened. */
  rowsByDb: Record<string, Row[]>;
  loadedDbs: Set<string>;

  init: () => Promise<void>;
  createDatabase: (pageId: string) => Promise<void>;
  loadRows: (dbId: string) => Promise<void>;

  addProperty: (dbId: string, type: PropertyType) => void;
  updateProperty: (dbId: string, propId: string, patch: Partial<PropertyDef>) => void;
  deleteProperty: (dbId: string, propId: string) => void;
  addOption: (dbId: string, propId: string, name: string) => SelectOption | undefined;

  addRow: (dbId: string) => Promise<void>;
  updateRowValue: (rowId: string, dbId: string, propId: string, value: unknown) => void;
  deleteRow: (rowId: string, dbId: string) => Promise<void>;

  deleteDatabase: (dbId: string) => Promise<void>;
}

function defaultSchema(id: string): Database {
  const titlePropId = newId();
  return {
    id,
    titlePropId,
    properties: [
      { id: titlePropId, name: 'Nom', type: 'text' },
      {
        id: newId(),
        name: 'Statut',
        type: 'select',
        options: [
          { id: newId(), name: 'À faire', color: 'gray' },
          { id: newId(), name: 'En cours', color: 'blue' },
          { id: newId(), name: 'Terminé', color: 'green' },
        ],
      },
    ],
    views: [{ id: newId(), name: 'Table', type: 'table' }],
  };
}

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  databases: {},
  rowsByDb: {},
  loadedDbs: new Set(),

  async init() {
    const all = await db.databases.toArray();
    const map: Record<string, Database> = {};
    for (const d of all) map[d.id] = d;
    // Reset row caches so a fresh load (e.g. after import) re-reads from disk.
    set({ databases: map, rowsByDb: {}, loadedDbs: new Set() });
  },

  async createDatabase(pageId) {
    const schema = defaultSchema(pageId);
    await db.databases.put(schema);
    set((s) => ({
      databases: { ...s.databases, [pageId]: schema },
      rowsByDb: { ...s.rowsByDb, [pageId]: [] },
    }));
    // Seed with three empty rows like Notion does.
    for (let i = 0; i < 3; i++) await get().addRow(pageId);
  },

  async loadRows(dbId) {
    if (get().loadedDbs.has(dbId)) return;
    const rows = await db.rows.where('databaseId').equals(dbId).sortBy('order');
    set((s) => ({
      rowsByDb: { ...s.rowsByDb, [dbId]: rows },
      loadedDbs: new Set(s.loadedDbs).add(dbId),
    }));
  },

  addProperty(dbId, type) {
    const dbRec = get().databases[dbId];
    if (!dbRec) return;
    const count = dbRec.properties.filter((p) => p.type === type).length;
    const prop: PropertyDef = {
      id: newId(),
      name: type === 'text' ? 'Texte' : labelForType(type) + (count ? ` ${count + 1}` : ''),
      type,
      ...(type === 'select' || type === 'multiselect' ? { options: [] } : {}),
    };
    const updated = { ...dbRec, properties: [...dbRec.properties, prop] };
    void db.databases.put(updated);
    set((s) => ({ databases: { ...s.databases, [dbId]: updated } }));
  },

  updateProperty(dbId, propId, patch) {
    const dbRec = get().databases[dbId];
    if (!dbRec) return;
    const updated = {
      ...dbRec,
      properties: dbRec.properties.map((p) => (p.id === propId ? { ...p, ...patch } : p)),
    };
    void db.databases.put(updated);
    set((s) => ({ databases: { ...s.databases, [dbId]: updated } }));
  },

  deleteProperty(dbId, propId) {
    const dbRec = get().databases[dbId];
    if (!dbRec || propId === dbRec.titlePropId) return; // never delete the title
    const updated = {
      ...dbRec,
      properties: dbRec.properties.filter((p) => p.id !== propId),
    };
    void db.databases.put(updated);
    set((s) => ({ databases: { ...s.databases, [dbId]: updated } }));
  },

  addOption(dbId, propId, name) {
    const dbRec = get().databases[dbId];
    if (!dbRec) return undefined;
    const prop = dbRec.properties.find((p) => p.id === propId);
    if (!prop) return undefined;
    const option: SelectOption = {
      id: newId(),
      name,
      color: pickColor((prop.options?.length ?? 0) + name.length),
    };
    const updated = {
      ...dbRec,
      properties: dbRec.properties.map((p) =>
        p.id === propId ? { ...p, options: [...(p.options ?? []), option] } : p,
      ),
    };
    void db.databases.put(updated);
    set((s) => ({ databases: { ...s.databases, [dbId]: updated } }));
    return option;
  },

  async addRow(dbId) {
    const now = Date.now();
    const existing = get().rowsByDb[dbId] ?? [];
    const row: Row = {
      id: newId(),
      databaseId: dbId,
      values: {},
      order: existing.length,
      createdAt: now,
      updatedAt: now,
    };
    await db.rows.put(row);
    set((s) => ({
      rowsByDb: { ...s.rowsByDb, [dbId]: [...(s.rowsByDb[dbId] ?? []), row] },
    }));
  },

  updateRowValue(rowId, dbId, propId, value) {
    const rows = get().rowsByDb[dbId] ?? [];
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    const updated: Row = {
      ...row,
      values: { ...row.values, [propId]: value },
      updatedAt: Date.now(),
    };
    void db.rows.put(updated);
    set((s) => ({
      rowsByDb: {
        ...s.rowsByDb,
        [dbId]: (s.rowsByDb[dbId] ?? []).map((r) => (r.id === rowId ? updated : r)),
      },
    }));
  },

  async deleteRow(rowId, dbId) {
    await db.rows.delete(rowId);
    set((s) => ({
      rowsByDb: {
        ...s.rowsByDb,
        [dbId]: (s.rowsByDb[dbId] ?? []).filter((r) => r.id !== rowId),
      },
    }));
  },

  async deleteDatabase(dbId) {
    await db.transaction('rw', db.databases, db.rows, async () => {
      await db.databases.delete(dbId);
      await db.rows.where('databaseId').equals(dbId).delete();
    });
    set((s) => {
      const databases = { ...s.databases };
      delete databases[dbId];
      const rowsByDb = { ...s.rowsByDb };
      delete rowsByDb[dbId];
      return { databases, rowsByDb };
    });
  },
}));

function labelForType(type: PropertyType): string {
  switch (type) {
    case 'number':
      return 'Nombre';
    case 'date':
      return 'Date';
    case 'checkbox':
      return 'Case';
    case 'select':
      return 'Sélection';
    case 'multiselect':
      return 'Multi-sélection';
    default:
      return 'Texte';
  }
}
