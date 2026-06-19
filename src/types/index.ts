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
