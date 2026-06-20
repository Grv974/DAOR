import { useMemo, useState } from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';
import { useEntityStore } from '@/store/useEntityStore';
import {
  type Interaction,
  type Proximity,
  PROXIMITY_LABELS,
  PROXIMITY_ORDER,
} from '@/types/aura';
import { daysSince, isOverdueCadence, relationalScore, scoreDots } from '@/lib/aura/crm';
import { TimeMachine } from '@/components/aura/TimeMachine';

const INTERACTION_KINDS: { id: Interaction['kind']; label: string }[] = [
  { id: 'call', label: 'Appel' },
  { id: 'coffee', label: 'Café' },
  { id: 'message', label: 'Message' },
  { id: 'event', label: 'Événement' },
  { id: 'other', label: 'Autre' },
];

export function CrmModule() {
  const entities = useEntityStore((s) => s.entities);
  const createEntity = useEntityStore((s) => s.createEntity);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const contacts = useMemo(
    () =>
      Object.values(entities)
        .filter((e) => e.type === 'contact' && !e.archived)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [entities],
  );
  const interactions = useEntityStore((s) => s.interactions);

  const lastContactDays = (id: string): number | null => {
    const dates = interactions.filter((i) => i.contactId === id).map((i) => i.date).sort();
    const last = dates.at(-1);
    return last ? daysSince(last) : null;
  };

  const filtered = contacts.filter((c) => !query || c.title.toLowerCase().includes(query.toLowerCase()));

  const addContact = async () => {
    const id = await createEntity('contact', { title: 'Nouveau contact', props: { proximity: 'acquaintance', cadence: 90 } });
    setSelected(id);
  };

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="flex w-72 shrink-0 flex-col border-r border-notion-border dark:border-notion-border-dark">
        <div className="flex items-center gap-2 px-3 py-3">
          <h1 className="text-lg font-bold">CRM</h1>
          <button onClick={addContact} className="ml-auto rounded-md bg-notion-accent px-2 py-1 text-xs font-medium text-white">
            <Plus size={14} className="inline" /> Contact
          </button>
        </div>
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-md border border-notion-border px-2 py-1 dark:border-notion-border-dark">
          <Search size={14} className="text-notion-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher…" className="w-full bg-transparent text-sm outline-none" />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {filtered.length === 0 && <p className="px-2 py-4 text-sm text-notion-muted">Aucun contact.</p>}
          {filtered.map((c) => {
            const days = lastContactDays(c.id);
            const cold = isOverdueCadence(days, (c.props.cadence as number) ?? 90);
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${selected === c.id ? 'bg-notion-hover dark:bg-notion-hover-dark' : 'hover:bg-notion-hover dark:hover:bg-notion-hover-dark'}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                  {(c.title || '?').slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{c.title || 'Sans nom'}</span>
                  <span className="block truncate text-xs text-notion-muted">{(c.props.role as string) || (c.props.company as string) || ''}</span>
                </span>
                {cold && <span className="shrink-0 text-xs text-amber-600" title="Contact froid">●</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fiche */}
      {selected ? (
        <ContactCard key={selected} contactId={selected} onClose={() => setSelected(null)} />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-notion-muted">
          Sélectionnez ou créez un contact.
        </div>
      )}
    </div>
  );
}

function ContactCard({ contactId, onClose }: { contactId: string; onClose: () => void }) {
  const c = useEntityStore((s) => s.entities[contactId]);
  const updateEntity = useEntityStore((s) => s.updateEntity);
  const updateProps = useEntityStore((s) => s.updateProps);
  const deleteEntity = useEntityStore((s) => s.deleteEntity);
  const allInteractions = useEntityStore((s) => s.interactions);
  const addInteraction = useEntityStore((s) => s.addInteraction);
  const removeInteraction = useEntityStore((s) => s.removeInteraction);
  const commitments = useEntityStore((s) => s.commitments);
  const addCommitment = useEntityStore((s) => s.addCommitment);
  const updateCommitment = useEntityStore((s) => s.updateCommitment);
  const removeCommitment = useEntityStore((s) => s.removeCommitment);

  const [newInter, setNewInter] = useState({ date: new Date().toISOString().slice(0, 10), kind: 'call' as Interaction['kind'], summary: '' });
  const [newCommit, setNewCommit] = useState({ direction: 'promise' as 'promise' | 'request', text: '', due: '' });

  if (!c) return null;
  const p = c.props;
  const interactions = allInteractions.filter((i) => i.contactId === contactId).sort((a, b) => b.date.localeCompare(a.date));
  const contactCommitments = commitments.filter((x) => x.contactId === contactId);
  const promisesOpen = contactCommitments.filter((x) => x.direction === 'promise' && !x.done).length;
  const requestsOpen = contactCommitments.filter((x) => x.direction === 'request' && !x.done).length;
  const cadence = (p.cadence as number) ?? 90;
  const proximity = (p.proximity as Proximity) ?? 'acquaintance';
  const score = relationalScore(interactions, cadence, proximity, promisesOpen, requestsOpen);
  const dots = scoreDots(score);
  const days = interactions[0] ? daysSince(interactions[0].date) : null;
  const cold = isOverdueCadence(days, cadence);
  const tags = (p.interests as string[]) ?? [];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-200">
            {(c.title || '?').slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <input value={c.title} onChange={(e) => updateEntity(contactId, { title: e.target.value })} placeholder="Nom Prénom" className="w-full bg-transparent text-xl font-bold outline-none" />
            <div className="flex items-center gap-2 text-xs text-notion-muted">
              <span title="Score relationnel">{'●'.repeat(dots)}{'○'.repeat(5 - dots)}</span>
              <span>· score {score}</span>
              {cold && <span className="text-amber-600">· contact froid ({days ?? '—'} j)</span>}
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <F t="Entreprise"><input value={(p.company as string) ?? ''} onChange={(e) => updateProps(contactId, { company: e.target.value })} className={inp} /></F>
          <F t="Poste"><input value={(p.role as string) ?? ''} onChange={(e) => updateProps(contactId, { role: e.target.value })} className={inp} /></F>
          <F t="Secteur"><input value={(p.sector as string) ?? ''} onChange={(e) => updateProps(contactId, { sector: e.target.value })} className={inp} /></F>
          <F t="Localisation"><input value={(p.location as string) ?? ''} onChange={(e) => updateProps(contactId, { location: e.target.value })} className={inp} /></F>
          <F t="Email"><input value={(p.email as string) ?? ''} onChange={(e) => updateProps(contactId, { email: e.target.value })} className={inp} /></F>
          <F t="Téléphone"><input value={(p.phone as string) ?? ''} onChange={(e) => updateProps(contactId, { phone: e.target.value })} className={inp} /></F>
          <F t="LinkedIn"><input value={(p.linkedin as string) ?? ''} onChange={(e) => updateProps(contactId, { linkedin: e.target.value })} className={inp} placeholder="in/…" /></F>
          <F t="X / autre"><input value={(p.twitter as string) ?? ''} onChange={(e) => updateProps(contactId, { twitter: e.target.value })} className={inp} /></F>
          <F t="Proximité">
            <select value={proximity} onChange={(e) => updateProps(contactId, { proximity: e.target.value })} className={inp}>
              {PROXIMITY_ORDER.map((pr) => (<option key={pr} value={pr}>{PROXIMITY_LABELS[pr]}</option>))}
            </select>
          </F>
          <F t="Cadence de suivi (j)"><input type="number" value={cadence} onChange={(e) => updateProps(contactId, { cadence: Number(e.target.value) })} className={inp} /></F>
        </div>

        {/* Interests / tags */}
        <div className="mt-3">
          <div className="mb-1 text-xs font-medium text-notion-muted">Centres d'intérêt</div>
          <div className="flex flex-wrap items-center gap-1">
            {tags.map((t, i) => (
              <span key={i} className="flex items-center gap-1 rounded bg-notion-hover px-1.5 py-0.5 text-xs dark:bg-notion-hover-dark">
                {t}
                <X size={11} className="cursor-pointer" onClick={() => updateProps(contactId, { interests: tags.filter((_, j) => j !== i) })} />
              </span>
            ))}
            <input
              placeholder="+ tag"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  updateProps(contactId, { interests: [...tags, e.currentTarget.value.trim()] });
                  e.currentTarget.value = '';
                }
              }}
              className="w-20 bg-transparent text-xs outline-none"
            />
          </div>
        </div>

        {/* Promesses & demandes */}
        <Section title="Promesses & demandes">
          {contactCommitments.map((cm) => (
            <div key={cm.id} className="flex items-center gap-2 py-0.5 text-sm">
              <input type="checkbox" checked={cm.done} onChange={(e) => updateCommitment(cm.id, { done: e.target.checked })} className="accent-notion-accent" />
              <span className={cm.direction === 'promise' ? 'text-blue-500' : 'text-green-600'}>{cm.direction === 'promise' ? '↑ je dois' : '↓ on me doit'}</span>
              <span className={`flex-1 truncate ${cm.done ? 'text-notion-muted line-through' : ''}`}>{cm.text}</span>
              {cm.due && <span className="text-xs text-notion-muted">{cm.due}</span>}
              <button onClick={() => removeCommitment(cm.id)} className="text-notion-muted hover:text-red-600"><X size={12} /></button>
            </div>
          ))}
          <div className="mt-1 flex items-center gap-1">
            <select value={newCommit.direction} onChange={(e) => setNewCommit({ ...newCommit, direction: e.target.value as 'promise' | 'request' })} className={`${inp} w-28`}>
              <option value="promise">Je dois</option>
              <option value="request">On me doit</option>
            </select>
            <input value={newCommit.text} onChange={(e) => setNewCommit({ ...newCommit, text: e.target.value })} placeholder="Engagement…" className={`${inp} flex-1`} />
            <input type="date" value={newCommit.due} onChange={(e) => setNewCommit({ ...newCommit, due: e.target.value })} className={`${inp} w-36`} />
            <button
              onClick={() => {
                if (!newCommit.text.trim()) return;
                addCommitment({ contactId, direction: newCommit.direction, text: newCommit.text.trim(), due: newCommit.due || null, done: false });
                setNewCommit({ direction: 'promise', text: '', due: '' });
              }}
              className="rounded bg-notion-accent px-2 py-1 text-xs text-white"
            >
              +
            </button>
          </div>
        </Section>

        {/* Historique des interactions */}
        <Section title="Historique des échanges">
          <div className="mb-2 flex items-center gap-1">
            <input type="date" value={newInter.date} onChange={(e) => setNewInter({ ...newInter, date: e.target.value })} className={`${inp} w-36`} />
            <select value={newInter.kind} onChange={(e) => setNewInter({ ...newInter, kind: e.target.value as Interaction['kind'] })} className={`${inp} w-28`}>
              {INTERACTION_KINDS.map((k) => (<option key={k.id} value={k.id}>{k.label}</option>))}
            </select>
            <input value={newInter.summary} onChange={(e) => setNewInter({ ...newInter, summary: e.target.value })} placeholder="Résumé…" className={`${inp} flex-1`} />
            <button
              onClick={() => {
                if (!newInter.summary.trim()) return;
                addInteraction({ contactId, date: newInter.date, kind: newInter.kind, summary: newInter.summary.trim() });
                setNewInter({ date: new Date().toISOString().slice(0, 10), kind: 'call', summary: '' });
              }}
              className="rounded bg-notion-accent px-2 py-1 text-xs text-white"
            >
              +
            </button>
          </div>
          {interactions.length === 0 ? (
            <p className="text-xs text-notion-muted">Aucune interaction enregistrée.</p>
          ) : (
            interactions.map((i) => (
              <div key={i.id} className="group flex items-center gap-2 py-0.5 text-sm">
                <span className="w-20 shrink-0 text-xs text-notion-muted">{i.date.slice(5)}</span>
                <span className="shrink-0 rounded bg-notion-hover px-1 text-[10px] dark:bg-notion-hover-dark">{INTERACTION_KINDS.find((k) => k.id === i.kind)?.label}</span>
                <span className="flex-1 truncate">{i.summary}</span>
                <button onClick={() => removeInteraction(i.id)} className="text-notion-muted opacity-0 hover:text-red-600 group-hover:opacity-100"><X size={12} /></button>
              </div>
            ))
          )}
        </Section>

        <Section title="Time-machine relationnelle">
          <TimeMachine contactId={contactId} />
        </Section>

        <F t="Notes libres">
          <textarea value={(p.notes as string) ?? ''} onChange={(e) => updateProps(contactId, { notes: e.target.value })} rows={3} className={`${inp} resize-y`} />
        </F>

        <button onClick={() => { if (confirm('Supprimer ce contact ?')) { void deleteEntity(contactId); onClose(); } }} className="mt-4 flex items-center gap-1 text-xs text-red-600">
          <Trash2 size={13} /> Supprimer le contact
        </button>
      </div>
    </div>
  );
}

const inp = 'w-full rounded border border-notion-border bg-transparent px-2 py-1 text-sm outline-none dark:border-notion-border-dark';

function F({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-notion-muted">{t}</div>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}
