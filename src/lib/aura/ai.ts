import { useEntityStore } from '@/store/useEntityStore';
import { HORIZON_LABELS, type Entity } from '@/types/aura';
import { daysSince, isOverdueCadence } from '@/lib/aura/crm';

const KEY_STORAGE = 'daor:anthropicKey';

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function setApiKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* ignore */
  }
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Build a compact snapshot of the user's AURA data for the model. */
export function buildContext(): string {
  const s = useEntityStore.getState();
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];

  const objectives = s.byType('objective');
  if (objectives.length) {
    lines.push('## Objectifs');
    for (const o of objectives.slice(0, 12)) {
      const h = (o.props.horizon as keyof typeof HORIZON_LABELS) || 'annual';
      lines.push(`- [${HORIZON_LABELS[h]}] ${o.title || 'Sans titre'} — avancement ${pct(s.progressOf(o.id))}`);
    }
  }

  const tasks = s.byType('task').filter((t) => t.props.status !== 'done');
  if (tasks.length) {
    lines.push('\n## Tâches en cours');
    for (const t of tasks.slice(0, 15)) {
      const due = t.props.due ? ` (échéance ${t.props.due})` : '';
      lines.push(`- ${t.title || 'Sans titre'} [${(t.props.priority as string) || 'medium'}]${due}`);
    }
  }

  const contacts = s.byType('contact');
  const cold = contacts
    .map((c) => {
      const last = s.interactions.filter((i) => i.contactId === c.id).map((i) => i.date).sort().at(-1);
      return { c, days: last ? daysSince(last) : null, cadence: (c.props.cadence as number) ?? 90 };
    })
    .filter((x) => isOverdueCadence(x.days, x.cadence));
  if (cold.length) {
    lines.push('\n## Contacts à relancer (froids)');
    for (const { c, days } of cold.slice(0, 10)) {
      lines.push(`- ${c.title || 'Sans nom'}${c.props.company ? ` (${c.props.company})` : ''} — ${days ?? 'jamais'} j sans contact`);
    }
  }

  const opps = s.byType('opportunity').filter((o) => !['won', 'lost'].includes(o.props.stage as string));
  if (opps.length) {
    lines.push('\n## Opportunités ouvertes');
    for (const o of opps.slice(0, 10)) {
      lines.push(`- ${o.title || 'Sans titre'} — étape ${o.props.stage}, prob ${o.props.probability ?? 0}%${o.props.nextAction ? `, prochaine action: ${o.props.nextAction}` : ''}`);
    }
  }

  const commits = s.commitments.filter((c) => !c.done);
  if (commits.length) {
    lines.push('\n## Engagements ouverts');
    for (const cm of commits.slice(0, 10)) {
      const who = s.entities[cm.contactId]?.title ?? 'contact';
      lines.push(`- ${cm.direction === 'promise' ? 'Je dois' : 'On me doit'} : ${cm.text} (${who})`);
    }
  }

  return `Date du jour : ${today}\n\n${lines.join('\n') || 'Aucune donnée encore saisie.'}`;
}

/** Build a focused brief for preparing a meeting with a contact. */
export function buildContactContext(contact: Entity): string {
  const s = useEntityStore.getState();
  const p = contact.props;
  const interactions = s.interactions
    .filter((i) => i.contactId === contact.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const commits = s.commitments.filter((c) => c.contactId === contact.id && !c.done);
  const lines = [
    `# ${contact.title || 'Contact'}`,
    `Entreprise: ${(p.company as string) || '—'} · Poste: ${(p.role as string) || '—'} · Secteur: ${(p.sector as string) || '—'}`,
    `Proximité: ${(p.proximity as string) || '—'} · Centres d'intérêt: ${((p.interests as string[]) ?? []).join(', ') || '—'}`,
  ];
  if (interactions.length) {
    lines.push('\nHistorique récent:');
    for (const i of interactions.slice(0, 6)) lines.push(`- ${i.date} [${i.kind}] ${i.summary}`);
  }
  if (commits.length) {
    lines.push('\nEngagements ouverts:');
    for (const c of commits) lines.push(`- ${c.direction === 'promise' ? 'Je dois' : 'On me doit'} : ${c.text}`);
  }
  if (p.notes) lines.push(`\nNotes: ${p.notes as string}`);
  return lines.join('\n');
}

const SYSTEM_PROMPT =
  "Tu es le copilote d'AURA, un Operating System personnel. Tu aides l'utilisateur à aligner son quotidien sur ses objectifs et à entretenir son réseau. " +
  'Réponds en français, de façon concise et actionnable (puces courtes, priorités claires). Appuie-toi uniquement sur les données fournies ; ' +
  "si une information manque, dis-le brièvement plutôt que d'inventer.";

/**
 * Call Claude directly from the browser (BYO API key). The SDK is imported
 * lazily so it stays out of the initial bundle.
 */
export async function askCopilot(userPrompt: string, context: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Aucune clé API configurée.');

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `${userPrompt}\n\n--- Données de l'utilisateur ---\n${context}` }],
  });

  return response.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n')
    .trim();
}
