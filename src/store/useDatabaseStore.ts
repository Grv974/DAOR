import { create } from 'zustand';
import { db } from '@/db/db';
import type {
  Database,
  DatabaseView,
  PropertyDef,
  PropertyType,
  Row,
  RowTemplate,
  SelectOption,
  ViewType,
} from '@/types';
import { newId } from '@/lib/id';
import { pickColor } from '@/lib/colors';

const VIEW_LABELS: Record<ViewType, string> = {
  table: 'Table',
  kanban: 'Kanban',
  gallery: 'Galerie',
  calendar: 'Calendrier',
};

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

  addView: (dbId: string, type: ViewType) => string | undefined;
  updateView: (dbId: string, viewId: string, patch: Partial<DatabaseView>) => void;
  deleteView: (dbId: string, viewId: string) => void;

  addTemplate: (dbId: string, name: string, values: Record<string, unknown>) => void;
  updateTemplate: (dbId: string, templateId: string, values: Record<string, unknown>) => void;
  deleteTemplate: (dbId: string, templateId: string) => void;

  addRow: (dbId: string, templateId?: string) => Promise<void>;
  updateRowValue: (rowId: string, dbId: string, propId: string, value: unknown) => void;
  deleteRow: (rowId: string, dbId: string) => Promise<void>;

  deleteDatabase: (dbId: string) => Promise<void>;
}

function newView(type: ViewType, firstSelectProp?: string, firstDateProp?: string): DatabaseView {
  return {
    id: newId(),
    name: VIEW_LABELS[type],
    type,
    filters: [],
    sorts: [],
    groupByPropId: type === 'kanban' ? (firstSelectProp ?? null) : null,
    datePropId: type === 'calendar' ? (firstDateProp ?? null) : null,
  };
}

/** Backfill fields added in later versions onto databases loaded from disk. */
function normalizeDatabase(d: Database): Database {
  return {
    ...d,
    templates: d.templates ?? [],
    views: (d.views ?? []).map((v) => ({
      ...v,
      filters: v.filters ?? [],
      sorts: v.sorts ?? [],
      groupByPropId: v.groupByPropId ?? null,
      datePropId: v.datePropId ?? null,
    })),
  };
}

function defaultSchema(id: string): Database {
  const titlePropId = newId();
  const statusId = newId();
  return {
    id,
    titlePropId,
    templates: [],
    properties: [
      { id: titlePropId, name: 'Nom', type: 'text' },
      {
        id: statusId,
        name: 'Statut',
        type: 'select',
        options: [
          { id: newId(), name: 'À faire', color: 'gray' },
          { id: newId(), name: 'En cours', color: 'blue' },
          { id: newId(), name: 'Terminé', color: 'green' },
        ],
      },
    ],
    views: [newView('table')],
  };
}

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  databases: {},
  rowsByDb: {},
  loadedDbs: new Set(),

  async init() {
    const all = await db.databases.toArray();
    const map: Record<string, Database> = {};
    for (const d of all) map[d.id] = normalizeDatabase(d);
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

  addView(dbId, type) {
    const dbRec = get().databases[dbId];
    if (!dbRec) return undefined;
    const firstSelect = dbRec.properties.find((p) => p.type === 'select')?.id;
    const firstDate = dbRec.properties.find((p) => p.type === 'date')?.id;
    const view = newView(type, firstSelect, firstDate);
    const updated = { ...dbRec, views: [...dbRec.views, view] };
    void db.databases.put(updated);
    set((s) => ({ databases: { ...s.databases, [dbId]: updated } }));
    return view.id;
  },

  updateView(dbId, viewId, patch) {
    const dbRec = get().databases[dbId];
    if (!dbRec) return;
    const updated = {
      ...dbRec,
      views: dbRec.views.map((v) => (v.id === viewId ? { ...v, ...patch } : v)),
    };
    void db.databases.put(updated);
    set((s) => ({ databases: { ...s.databases, [dbId]: updated } }));
  },

  deleteView(dbId, viewId) {
    const dbRec = get().databases[dbId];
    if (!dbRec || dbRec.views.length <= 1) return; // keep at least one view
    const updated = { ...dbRec, views: dbRec.views.filter((v) => v.id !== viewId) };
    void db.databases.put(updated);
    set((s) => ({ databases: { ...s.databases, [dbId]: updated } }));
  },

  addTemplate(dbId, name, values) {
    const dbRec = get().databases[dbId];
    if (!dbRec) return;
    const template: RowTemplate = { id: newId(), name, values };
    const updated = { ...dbRec, templates: [...dbRec.templates, template] };
    void db.databases.put(updated);
    set((s) => ({ databases: { ...s.databases, [dbId]: updated } }));
  },

  updateTemplate(dbId, templateId, values) {
    const dbRec = get().databases[dbId];
    if (!dbRec) return;
    const updated = {
      ...dbRec,
      templates: dbRec.templates.map((t) => (t.id === templateId ? { ...t, values } : t)),
    };
    void db.databases.put(updated);
    set((s) => ({ databases: { ...s.databases, [dbId]: updated } }));
  },

  deleteTemplate(dbId, templateId) {
    const dbRec = get().databases[dbId];
    if (!dbRec) return;
    const updated = { ...dbRec, templates: dbRec.templates.filter((t) => t.id !== templateId) };
    void db.databases.put(updated);
    set((s) => ({ databases: { ...s.databases, [dbId]: updated } }));
  },

  async addRow(dbId, templateId) {
    const now = Date.now();
    const existing = get().rowsByDb[dbId] ?? [];
    const template = templateId
      ? get().databases[dbId]?.templates.find((t) => t.id === templateId)
      : undefined;
    const row: Row = {
      id: newId(),
      databaseId: dbId,
      values: template ? { ...template.values } : {},
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
