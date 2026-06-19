import { create } from 'zustand';
import { db } from '@/db/db';
import { newId } from '@/lib/id';
import {
  type Commitment,
  type Entity,
  type EntityType,
  type Interaction,
  type Priority,
  PRIORITY_WEIGHT,
  type Relation,
  type RelationType,
} from '@/types/aura';

interface EntityState {
  entities: Record<string, Entity>;
  relations: Relation[];
  commitments: Commitment[];
  interactions: Interaction[];
  loaded: boolean;

  init: () => Promise<void>;

  createEntity: (type: EntityType, partial?: Partial<Entity>) => Promise<string>;
  updateEntity: (id: string, patch: Partial<Entity>) => void;
  updateProps: (id: string, props: Record<string, unknown>) => void;
  deleteEntity: (id: string) => Promise<void>;

  addRelation: (source: string, target: string, type: RelationType, meta?: Record<string, unknown>) => void;
  removeRelation: (id: string) => void;
  setParent: (childId: string, parentId: string | null) => void;

  addCommitment: (c: Omit<Commitment, 'id' | 'createdAt'>) => void;
  updateCommitment: (id: string, patch: Partial<Commitment>) => void;
  removeCommitment: (id: string) => void;

  addInteraction: (i: Omit<Interaction, 'id'>) => void;
  removeInteraction: (id: string) => void;

  // Derived helpers
  childrenOf: (parentId: string) => Entity[];
  parentOf: (childId: string) => Entity | undefined;
  neighbors: (id: string) => { relation: Relation; other: Entity }[];
  byType: (type: EntityType) => Entity[];
  progressOf: (id: string) => number;
  orphans: () => Entity[];
}

export const useEntityStore = create<EntityState>((set, get) => ({
  entities: {},
  relations: [],
  commitments: [],
  interactions: [],
  loaded: false,

  async init() {
    const [ents, rels, coms, inters] = await Promise.all([
      db.entities.toArray(),
      db.relations.toArray(),
      db.commitments.toArray(),
      db.interactions.toArray(),
    ]);
    const map: Record<string, Entity> = {};
    for (const e of ents) map[e.id] = e;
    set({ entities: map, relations: rels, commitments: coms, interactions: inters, loaded: true });
  },

  async createEntity(type, partial) {
    const now = Date.now();
    const entity: Entity = {
      id: newId(),
      type,
      title: '',
      props: {},
      body: null,
      createdAt: now,
      updatedAt: now,
      ...partial,
    };
    await db.entities.put(entity);
    set((s) => ({ entities: { ...s.entities, [entity.id]: entity } }));
    return entity.id;
  },

  updateEntity(id, patch) {
    set((s) => {
      const cur = s.entities[id];
      if (!cur) return s;
      const updated = { ...cur, ...patch, updatedAt: Date.now() };
      void db.entities.put(updated);
      return { entities: { ...s.entities, [id]: updated } };
    });
  },

  updateProps(id, props) {
    set((s) => {
      const cur = s.entities[id];
      if (!cur) return s;
      const updated = { ...cur, props: { ...cur.props, ...props }, updatedAt: Date.now() };
      void db.entities.put(updated);
      return { entities: { ...s.entities, [id]: updated } };
    });
  },

  async deleteEntity(id) {
    await db.transaction('rw', db.entities, db.relations, db.commitments, db.interactions, async () => {
      await db.entities.delete(id);
      const rels = get().relations.filter((r) => r.source === id || r.target === id);
      await db.relations.bulkDelete(rels.map((r) => r.id));
      await db.commitments.where('contactId').equals(id).delete();
      await db.interactions.where('contactId').equals(id).delete();
    });
    set((s) => {
      const entities = { ...s.entities };
      delete entities[id];
      return {
        entities,
        relations: s.relations.filter((r) => r.source !== id && r.target !== id),
        commitments: s.commitments.filter((c) => c.contactId !== id),
        interactions: s.interactions.filter((i) => i.contactId !== id),
      };
    });
  },

  addRelation(source, target, type, meta) {
    if (source === target) return;
    // Avoid duplicate identical edges.
    if (get().relations.some((r) => r.source === source && r.target === target && r.type === type)) return;
    const rel: Relation = { id: newId(), source, target, type, meta };
    void db.relations.put(rel);
    set((s) => ({ relations: [...s.relations, rel] }));
  },

  removeRelation(id) {
    void db.relations.delete(id);
    set((s) => ({ relations: s.relations.filter((r) => r.id !== id) }));
  },

  setParent(childId, parentId) {
    set((s) => {
      // Remove any existing cascade parent for this child.
      const keep = s.relations.filter((r) => !(r.type === 'parent' && r.source === childId));
      const removed = s.relations.filter((r) => r.type === 'parent' && r.source === childId);
      for (const r of removed) void db.relations.delete(r.id);
      let relations = keep;
      if (parentId && parentId !== childId) {
        const rel: Relation = { id: newId(), source: childId, target: parentId, type: 'parent' };
        void db.relations.put(rel);
        relations = [...keep, rel];
      }
      return { relations };
    });
  },

  addCommitment(c) {
    const commitment: Commitment = { ...c, id: newId(), createdAt: Date.now() };
    void db.commitments.put(commitment);
    set((s) => ({ commitments: [...s.commitments, commitment] }));
  },

  updateCommitment(id, patch) {
    set((s) => {
      const cur = s.commitments.find((c) => c.id === id);
      if (!cur) return s;
      const updated = { ...cur, ...patch };
      void db.commitments.put(updated);
      return { commitments: s.commitments.map((c) => (c.id === id ? updated : c)) };
    });
  },

  removeCommitment(id) {
    void db.commitments.delete(id);
    set((s) => ({ commitments: s.commitments.filter((c) => c.id !== id) }));
  },

  addInteraction(i) {
    const interaction: Interaction = { ...i, id: newId() };
    void db.interactions.put(interaction);
    set((s) => ({ interactions: [...s.interactions, interaction] }));
  },

  removeInteraction(id) {
    void db.interactions.delete(id);
    set((s) => ({ interactions: s.interactions.filter((i) => i.id !== id) }));
  },

  childrenOf(parentId) {
    const { entities, relations } = get();
    return relations
      .filter((r) => r.type === 'parent' && r.target === parentId)
      .map((r) => entities[r.source])
      .filter(Boolean);
  },

  parentOf(childId) {
    const { entities, relations } = get();
    const rel = relations.find((r) => r.type === 'parent' && r.source === childId);
    return rel ? entities[rel.target] : undefined;
  },

  neighbors(id) {
    const { entities, relations } = get();
    return relations
      .filter((r) => r.source === id || r.target === id)
      .map((r) => {
        const otherId = r.source === id ? r.target : r.source;
        return { relation: r, other: entities[otherId] };
      })
      .filter((n) => n.other);
  },

  byType(type) {
    return Object.values(get().entities).filter((e) => e.type === type && !e.archived);
  },

  progressOf(id) {
    const { entities } = get();
    const memo = new Map<string, number>();
    const compute = (eid: string, seen: Set<string>): number => {
      if (memo.has(eid)) return memo.get(eid)!;
      if (seen.has(eid)) return 0;
      seen.add(eid);
      const e = entities[eid];
      if (!e) return 0;
      if (e.type === 'task') {
        const st = e.props.status as string | undefined;
        const v = st === 'done' ? 1 : st === 'doing' ? 0.5 : 0;
        memo.set(eid, v);
        return v;
      }
      const kids = get()
        .childrenOf(eid)
        .filter((k) => ['objective', 'project', 'task'].includes(k.type));
      if (kids.length === 0) {
        const p = e.props.progress;
        const v = typeof p === 'number' ? Math.max(0, Math.min(1, p)) : 0;
        memo.set(eid, v);
        return v;
      }
      let wsum = 0;
      let sum = 0;
      for (const k of kids) {
        const w = PRIORITY_WEIGHT[(k.props.priority as Priority) || 'medium'];
        wsum += w;
        sum += w * compute(k.id, seen);
      }
      const v = wsum ? sum / wsum : 0;
      memo.set(eid, v);
      return v;
    };
    return compute(id, new Set());
  },

  orphans() {
    const { relations } = get();
    const hasParent = new Set(relations.filter((r) => r.type === 'parent').map((r) => r.source));
    return Object.values(get().entities).filter(
      (e) => (e.type === 'task' || e.type === 'project') && !e.archived && !hasParent.has(e.id),
    );
  },
}));
