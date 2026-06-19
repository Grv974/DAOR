// Core domain types for the DAOR workspace.
// Pages form an infinitely-nestable tree. A page is either a rich-text
// document (Tiptap JSON) or, in later sprints, a database.

export type PageType = 'doc' | 'database';

export interface Page {
  id: string;
  parentId: string | null;
  title: string;
  icon: string | null; // emoji or null
  cover: string | null; // file id reference or url
  type: PageType;
  /** Tiptap document JSON for `doc` pages. */
  content: unknown | null;
  /** Ordered ids of direct children (controls sidebar + DnD order). */
  childrenOrder: string[];
  favorite: boolean;
  trashed: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Binary asset (image / file) stored as a Blob inside IndexedDB. */
export interface FileBlob {
  id: string;
  name: string;
  mime: string;
  size: number;
  blob: Blob;
  createdAt: number;
}

export interface ThemePref {
  mode: 'light' | 'dark';
}

// ---------------------------------------------------------------------------
// Databases (S4+)
// A database is attached 1:1 to a page of type 'database' (its id === pageId).
// ---------------------------------------------------------------------------

export type PropertyType =
  | 'text'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'select'
  | 'multiselect';

export type OptionColor =
  | 'gray'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red';

export interface SelectOption {
  id: string;
  name: string;
  color: OptionColor;
}

export interface PropertyDef {
  id: string;
  name: string;
  type: PropertyType;
  /** For select / multiselect properties. */
  options?: SelectOption[];
}

export type ViewType = 'table' | 'kanban' | 'gallery' | 'calendar';

export interface DatabaseView {
  id: string;
  name: string;
  type: ViewType;
}

export interface Database {
  /** Same as the owning page id. */
  id: string;
  properties: PropertyDef[];
  views: DatabaseView[];
  /** Property id used as the row title (first text property). */
  titlePropId: string;
}

/**
 * A database row. `values` maps a property id to its value:
 *  - text       -> string
 *  - number     -> number | null
 *  - date       -> ISO date string | null
 *  - checkbox   -> boolean
 *  - select     -> optionId | null
 *  - multiselect-> optionId[]
 */
export interface Row {
  id: string;
  databaseId: string;
  values: Record<string, unknown>;
  order: number;
  createdAt: number;
  updatedAt: number;
}

