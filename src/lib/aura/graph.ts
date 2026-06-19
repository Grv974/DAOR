import type { EntityType, Relation, RelationType } from '@/types/aura';

// Node category → color (halo / fill), per the spec's colour code.
export const NODE_COLOR: Record<string, string> = {
  contact: '#2383e2', // persons — blue
  company: '#8b8b8b', // companies — gray
  opportunity: '#22a06b', // opportunities — green
  project: '#8b5cf6', // projects — violet
  objective: '#e0883a', // objectives — amber
  vision: '#d4634f', // vision — terracotta
  journal: '#e0883a', // events — orange
  task: '#9b9a97',
  actionPlan: '#6b7280',
};

export const GRAPH_TYPES: { type: EntityType; label: string }[] = [
  { type: 'contact', label: 'Personnes' },
  { type: 'company', label: 'Entreprises' },
  { type: 'opportunity', label: 'Opportunités' },
  { type: 'project', label: 'Projets' },
  { type: 'objective', label: 'Objectifs' },
  { type: 'vision', label: 'Visions' },
];

interface LinkStyle {
  label: string;
  color: string;
  dash?: string;
  width: number;
  arrow?: boolean;
}

export const LINK_STYLE: Record<RelationType, LinkStyle> = {
  recommendation: { label: 'Recommandation', color: '#22a06b', width: 1.5, arrow: true },
  influence: { label: 'Influence', color: '#8b5cf6', width: 2, arrow: true },
  hierarchy: { label: 'Hiérarchie', color: '#2383e2', width: 2, arrow: true },
  partnership: { label: 'Partenariat', color: '#0d9488', width: 3 },
  conflict: { label: 'Conflit', color: '#dc2626', width: 1.5, dash: '4 3' },
  history: { label: 'Historique', color: '#9b9a97', width: 1.5, dash: '1 3' },
  opportunity: { label: 'Opportunité', color: '#22a06b', width: 1.5 },
  worksAt: { label: 'Travaille à', color: '#9b9a97', width: 1.5 },
  link: { label: 'Lien', color: '#b9b9b6', width: 1, dash: '2 3' },
  parent: { label: 'Cascade', color: '#a5b4fc', width: 1 },
};

export const LINKABLE_TYPES: RelationType[] = [
  'recommendation',
  'influence',
  'hierarchy',
  'partnership',
  'conflict',
  'history',
  'link',
];

/** Shortest path (BFS) between two nodes over an undirected view of relations. */
export function shortestPath(relations: Relation[], from: string, to: string): string[] {
  if (from === to) return [from];
  const adj = new Map<string, string[]>();
  for (const r of relations) {
    (adj.get(r.source) ?? adj.set(r.source, []).get(r.source)!).push(r.target);
    (adj.get(r.target) ?? adj.set(r.target, []).get(r.target)!).push(r.source);
  }
  const queue = [from];
  const prev = new Map<string, string | null>([[from, null]]);
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === to) break;
    for (const next of adj.get(cur) ?? []) {
      if (!prev.has(next)) {
        prev.set(next, cur);
        queue.push(next);
      }
    }
  }
  if (!prev.has(to)) return [];
  const path: string[] = [];
  let cur: string | null = to;
  while (cur !== null) {
    path.unshift(cur);
    cur = prev.get(cur) ?? null;
  }
  return path;
}
