// AURA — Personal Operating System layer.
// A unified entity + typed-relations model that powers BOTH the objective
// cascade (roll-up) and the relational graph (mur d'enquête) from a single
// abstraction, layered on top of the existing Notion-like socle.

export type EntityType =
  | 'vision'
  | 'objective'
  | 'actionPlan'
  | 'project'
  | 'task'
  | 'contact'
  | 'company'
  | 'opportunity'
  | 'journal';

export type Horizon = 'vision' | 'annual' | 'quarter' | 'month' | 'week';
export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type OppStage =
  | 'identified'
  | 'analysis'
  | 'discussion'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'postponed';

export type Proximity = 'unknown' | 'acquaintance' | 'ally' | 'close' | 'mentor';

export type TaskStatus = 'todo' | 'doing' | 'done';

export type JournalKind = 'note' | 'meeting' | 'reflection' | 'learning' | 'retro';

/**
 * Generic entity. Type-specific fields live in `props` so the model stays
 * open and a single store + relations table serves every module.
 */
export interface Entity {
  id: string;
  type: EntityType;
  title: string;
  props: Record<string, unknown>;
  /** Free-form rich text / notes (Tiptap JSON or plain string). */
  body?: unknown;
  createdAt: number;
  updatedAt: number;
  archived?: boolean;
}

// Typed edges. A single table serves the cascade ('parent') and the graph.
export type RelationType =
  | 'parent' // cascade: source(child) → target(parent)
  | 'worksAt' // contact → company
  | 'recommendation'
  | 'influence'
  | 'hierarchy'
  | 'partnership'
  | 'opportunity'
  | 'conflict'
  | 'history'
  | 'link'; // generic mention / association

export interface Relation {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  meta?: Record<string, unknown>;
}

// A promise made to / request received from a contact (relational debt).
export interface Commitment {
  id: string;
  contactId: string;
  /** 'promise' = I owe them; 'request' = they owe me. */
  direction: 'promise' | 'request';
  text: string;
  due?: string | null;
  done: boolean;
  createdAt: number;
}

// A dated interaction in a contact's history / journal.
export interface Interaction {
  id: string;
  contactId: string;
  date: string; // ISO date
  kind: 'call' | 'coffee' | 'message' | 'event' | 'other';
  summary: string;
}

export const HORIZON_LABELS: Record<Horizon, string> = {
  vision: 'Vision',
  annual: 'Annuel',
  quarter: 'Trimestriel',
  month: 'Mensuel',
  week: 'Hebdomadaire',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: 'Critique',
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
};

export const PRIORITY_WEIGHT: Record<Priority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const OPP_STAGES: { id: OppStage; label: string }[] = [
  { id: 'identified', label: 'Identifié' },
  { id: 'analysis', label: 'En analyse' },
  { id: 'discussion', label: 'En discussion' },
  { id: 'negotiation', label: 'En négociation' },
  { id: 'won', label: 'Gagné' },
  { id: 'lost', label: 'Perdu' },
  { id: 'postponed', label: 'Reporté' },
];

export const PROXIMITY_LABELS: Record<Proximity, string> = {
  unknown: 'Inconnu',
  acquaintance: 'Connaissance',
  ally: 'Allié',
  close: 'Proche',
  mentor: 'Mentor',
};

export const PROXIMITY_ORDER: Proximity[] = ['unknown', 'acquaintance', 'ally', 'close', 'mentor'];
