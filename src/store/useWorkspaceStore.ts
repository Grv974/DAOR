import { create } from 'zustand';
import { db } from '@/db/db';
import type { Page } from '@/types';
import { newId } from '@/lib/id';
import { createKeyedDebounce } from '@/lib/debounce';
import { searchIndex } from '@/lib/searchIndex';

const ROOT_ORDER_KEY = 'daor:rootOrder';

function loadRootOrder(): string[] {
  try {
    const raw = localStorage.getItem(ROOT_ORDER_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRootOrder(order: string[]) {
  try {
    localStorage.setItem(ROOT_ORDER_KEY, JSON.stringify(order));
  } catch {
    /* ignore quota errors */
  }
}

// Debounced persistence of page content so typing does not hammer IndexedDB.
const persistContent = createKeyedDebounce((id: string, content: unknown) => {
  void db.pages.update(id, { content, updatedAt: Date.now() });
}, 600);

// Debounced search re-index of a page (title + content) to avoid re-tokenising
// on every keystroke.
const reindexPage = createKeyedDebounce((_id: string, page: Page) => {
  searchIndex.upsertPage(page);
}, 600);

interface WorkspaceState {
  pages: Record<string, Page>;
  rootOrder: string[];
  loaded: boolean;

  init: () => Promise<void>;
  createPage: (parentId: string | null, partial?: Partial<Page>) => Promise<string>;
  updatePage: (id: string, patch: Partial<Page>) => void;
  updateContent: (id: string, content: unknown) => void;
  toggleFavorite: (id: string) => void;
  trashPage: (id: string) => Promise<void>;
  restorePage: (id: string) => Promise<void>;
  purgePage: (id: string) => Promise<void>;
  reorderChildren: (parentId: string | null, order: string[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  pages: {},
  rootOrder: [],
  loaded: false,

  async init() {
    const all = await db.pages.toArray();
    const map: Record<string, Page> = {};
    for (const p of all) map[p.id] = p;

    // Reconcile root order with what actually exists in the DB.
    const storedRoot = loadRootOrder();
    const liveRootIds = all.filter((p) => p.parentId === null).map((p) => p.id);
    const rootOrder = [
      ...storedRoot.filter((id) => liveRootIds.includes(id)),
      ...liveRootIds.filter((id) => !storedRoot.includes(id)),
    ];
    saveRootOrder(rootOrder);

    set({ pages: map, rootOrder, loaded: true });
  },

  async createPage(parentId, partial) {
    const now = Date.now();
    const page: Page = {
      id: newId(),
      parentId,
      title: '',
      icon: null,
      cover: null,
      type: 'doc',
      content: null,
      childrenOrder: [],
      favorite: false,
      trashed: false,
      createdAt: now,
      updatedAt: now,
      ...partial,
    };
    await db.pages.put(page);
    searchIndex.upsertPage(page);

    set((state) => {
      const pages = { ...state.pages, [page.id]: page };
      let rootOrder = state.rootOrder;
      if (parentId === null) {
        rootOrder = [...state.rootOrder, page.id];
        saveRootOrder(rootOrder);
      } else {
        const parent = pages[parentId];
        if (parent) {
          const updatedParent = {
            ...parent,
            childrenOrder: [...parent.childrenOrder, page.id],
            updatedAt: now,
          };
          pages[parentId] = updatedParent;
          void db.pages.update(parentId, {
            childrenOrder: updatedParent.childrenOrder,
            updatedAt: now,
          });
        }
      }
      return { pages, rootOrder };
    });

    return page.id;
  },

  updatePage(id, patch) {
    set((state) => {
      const current = state.pages[id];
      if (!current) return state;
      const updated = { ...current, ...patch, updatedAt: Date.now() };
      void db.pages.update(id, { ...patch, updatedAt: updated.updatedAt });
      // Title (and other metadata) changes are reflected in search.
      if ('title' in patch || 'trashed' in patch) searchIndex.upsertPage(updated);
      return { pages: { ...state.pages, [id]: updated } };
    });
  },

  updateContent(id, content) {
    set((state) => {
      const current = state.pages[id];
      if (!current) return state;
      // Keep the in-memory copy fresh immediately; persist is debounced.
      const updated = { ...current, content, updatedAt: Date.now() };
      persistContent(id, content);
      reindexPage(id, updated);
      return { pages: { ...state.pages, [id]: updated } };
    });
  },

  toggleFavorite(id) {
    const current = get().pages[id];
    if (!current) return;
    get().updatePage(id, { favorite: !current.favorite });
  },

  async trashPage(id) {
    // Recursively mark the page and all descendants as trashed.
    const { pages } = get();
    const toTrash: string[] = [];
    const walk = (pid: string) => {
      toTrash.push(pid);
      pages[pid]?.childrenOrder.forEach(walk);
    };
    walk(id);

    const now = Date.now();
    await db.transaction('rw', db.pages, async () => {
      for (const pid of toTrash) {
        await db.pages.update(pid, { trashed: true, updatedAt: now });
      }
    });
    for (const pid of toTrash) searchIndex.removePage(pid);

    set((state) => {
      const next = { ...state.pages };
      for (const pid of toTrash) {
        if (next[pid]) next[pid] = { ...next[pid], trashed: true, updatedAt: now };
      }
      // Detach from parent's children order / root order.
      const target = next[id];
      let rootOrder = state.rootOrder;
      if (target?.parentId === null) {
        rootOrder = state.rootOrder.filter((x) => x !== id);
        saveRootOrder(rootOrder);
      } else if (target?.parentId) {
        const parent = next[target.parentId];
        if (parent) {
          next[target.parentId] = {
            ...parent,
            childrenOrder: parent.childrenOrder.filter((x) => x !== id),
          };
          void db.pages.update(target.parentId, {
            childrenOrder: next[target.parentId].childrenOrder,
          });
        }
      }
      return { pages: next, rootOrder };
    });
  },

  async restorePage(id) {
    const target = get().pages[id];
    if (!target) return;
    const now = Date.now();
    await db.pages.update(id, { trashed: false, updatedAt: now });
    searchIndex.upsertPage({ ...target, trashed: false, updatedAt: now });

    set((state) => {
      const next = { ...state.pages };
      next[id] = { ...next[id], trashed: false, updatedAt: now };
      let rootOrder = state.rootOrder;
      // Re-attach to parent if it exists & is alive, else become a root page.
      const parent = target.parentId ? next[target.parentId] : null;
      if (parent && !parent.trashed) {
        if (!parent.childrenOrder.includes(id)) {
          next[parent.id] = { ...parent, childrenOrder: [...parent.childrenOrder, id] };
          void db.pages.update(parent.id, { childrenOrder: next[parent.id].childrenOrder });
        }
      } else {
        next[id] = { ...next[id], parentId: null };
        void db.pages.update(id, { parentId: null });
        rootOrder = [...state.rootOrder.filter((x) => x !== id), id];
        saveRootOrder(rootOrder);
      }
      return { pages: next, rootOrder };
    });
  },

  async purgePage(id) {
    const { pages } = get();
    const toDelete: string[] = [];
    const walk = (pid: string) => {
      toDelete.push(pid);
      pages[pid]?.childrenOrder.forEach(walk);
    };
    walk(id);
    await db.pages.bulkDelete(toDelete);
    for (const pid of toDelete) searchIndex.removePage(pid);
    set((state) => {
      const next = { ...state.pages };
      for (const pid of toDelete) delete next[pid];
      const rootOrder = state.rootOrder.filter((x) => !toDelete.includes(x));
      saveRootOrder(rootOrder);
      return { pages: next, rootOrder };
    });
  },

  reorderChildren(parentId, order) {
    if (parentId === null) {
      set({ rootOrder: order });
      saveRootOrder(order);
    } else {
      get().updatePage(parentId, { childrenOrder: order });
    }
  },
}));
