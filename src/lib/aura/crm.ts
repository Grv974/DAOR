import type { Interaction, Proximity } from '@/types/aura';
import { PROXIMITY_ORDER } from '@/types/aura';

export function daysSince(isoDate: string): number {
  const then = new Date(isoDate + 'T00:00:00').getTime();
  return Math.floor((Date.now() - then) / 864e5);
}

/** A contact is "cold" when the last interaction exceeds its target cadence. */
export function isOverdueCadence(days: number | null, cadence: number): boolean {
  if (days === null) return true; // never contacted
  return days > cadence;
}

/**
 * Composite relational health score (0..100) blending:
 *  - recency  (how recently we interacted vs cadence)
 *  - frequency(number of interactions, capped)
 *  - reciprocity (balance of promises owed vs requests received)
 *  - proximity (declared closeness)
 */
export function relationalScore(
  interactions: Interaction[],
  cadence: number,
  proximity: Proximity,
  promisesOpen: number,
  requestsOpen: number,
): number {
  const dates = interactions.map((i) => i.date).sort();
  const last = dates.at(-1);
  const days = last ? daysSince(last) : null;

  // Recency: 1 when fresh, decays to 0 at 2× cadence.
  const recency = days === null ? 0 : Math.max(0, 1 - days / (cadence * 2));

  // Frequency: interactions in the last year, capped at 12.
  const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const recent = interactions.filter((i) => i.date >= yearAgo).length;
  const frequency = Math.min(1, recent / 12);

  // Reciprocity: balanced is best; heavy unpaid debt (either side) lowers it.
  const imbalance = Math.abs(promisesOpen - requestsOpen);
  const reciprocity = Math.max(0, 1 - imbalance / 5);

  // Proximity on a 0..1 scale.
  const prox = PROXIMITY_ORDER.indexOf(proximity) / (PROXIMITY_ORDER.length - 1);

  const score = recency * 0.35 + frequency * 0.25 + reciprocity * 0.15 + prox * 0.25;
  return Math.round(score * 100);
}

/** Map a 0..100 score to a 0..5 dot rating. */
export function scoreDots(score: number): number {
  return Math.max(0, Math.min(5, Math.round(score / 20)));
}
