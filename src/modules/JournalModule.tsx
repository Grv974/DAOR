import { useMemo, useState } from 'react';
import { Link2, Search, Send } from 'lucide-react';
import { useEntityStore } from '@/store/useEntityStore';
import type { Entity, JournalKind } from '@/types/aura';

const KINDS: { id: JournalKind; label: string }[] = [
  { id: 'note', label: 'Note' },
  { id: 'meeting', label: 'Compte-rendu' },
  { id: 'reflection', label: 'Réflexion' },
  { id: 'learning', label: 'Apprentissage' },
  { id: 'retro', label: 'Rétrospective' },
];

const RETRO_TEMPLATE =
  '## Rétrospective\n\n**Victoires :**\n- \n\n**Obstacles :**\n- \n\n**Apprentissages :**\n- \n\n**Ajustements :**\n- ';

export function JournalModule() {
  const entities = useEntityStore((s) => s.entities);
  const relations = useEntityStore((s) => s.relations);
  const createEntity = useEntityStore((s) => s.createEntity);
  const addRelation = useEntityStore((s) => s.addRelation);
  const [text, setText] = useState('');
  const [kind, setKind] = useState<JournalKind>('note');
  const [query, setQuery] = useState('');

  const entries = useMemo(
    () =>
      Object.values(entities)
        .filter((e) => e.type === 'journal' && !e.archived)
        .sort((a, b) => String(b.props.date).localeCompare(String(a.props.date)) || b.createdAt - a.createdAt),
    [entities],
  );

  // Candidates for @/# auto-linking: contacts, projects, objectives, opportunities.
  const linkables = useMemo(
    () => Object.values(entities).filter((e) => ['contact', 'project', 'objective', 'opportunity'].includes(e.type)),
    [entities],
  );

  const filtered = entries.filter(
    (e) => !query.trim() || (e.props.text as string)?.toLowerCase().includes(query.toLowerCase()),
  );

  const linkMentions = (journalId: string, body: string) => {
    const tokens = body.match(/[@#]([\p{L}0-9][\p{L}0-9 _'-]{1,40})/gu) ?? [];
    for (const raw of tokens) {
      const name = raw.slice(1).trim().toLowerCase();
      const match = linkables.find((e) => e.title.toLowerCase() === name || e.title.toLowerCase().startsWith(name));
      if (match) addRelation(journalId, match.id, 'link', { via: 'mention' });
    }
  };

  const save = async () => {
    if (!text.trim()) return;
    const firstLine = text.trim().split('\n')[0].slice(0, 80);
    const id = await createEntity('journal', {
      title: firstLine,
      props: { kind, date: new Date().toISOString().slice(0, 10), text: text.trim() },
    });
    linkMentions(id, text);
    setText('');
    setKind('note');
  };

  const startRetro = () => {
    setKind('retro');
    setText(RETRO_TEMPLATE);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <div className="mb-4 flex items-center gap-3">
          <h1 className="text-2xl font-bold">Journal</h1>
          <button onClick={startRetro} className="ml-auto rounded-md border border-notion-border px-2 py-1 text-xs hover:bg-notion-hover dark:border-notion-border-dark dark:hover:bg-notion-hover-dark">
            Revue guidée
          </button>
        </div>

        {/* Composer */}
        <div className="mb-5 rounded-xl border border-notion-border bg-white p-3 shadow-sm dark:border-notion-border-dark dark:bg-[#202020]">
          <div className="mb-2 flex flex-wrap gap-1">
            {KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className={`rounded px-2 py-0.5 text-xs ${kind === k.id ? 'bg-notion-accent text-white' : 'text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark'}`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save();
            }}
            rows={3}
            placeholder="Quoi de neuf ? Mentionnez @contacts, #projets, objectifs… (Cmd/Ctrl+Entrée)"
            className="w-full resize-y bg-transparent text-sm outline-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-notion-muted">Les @mentions sont reliées automatiquement.</span>
            <button onClick={save} className="flex items-center gap-1 rounded-md bg-notion-accent px-3 py-1 text-xs font-medium text-white">
              <Send size={13} /> Enregistrer
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-3 flex items-center gap-2 rounded-md border border-notion-border px-2 py-1.5 dark:border-notion-border-dark">
          <Search size={15} className="text-notion-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher dans le journal…" className="w-full bg-transparent text-sm outline-none" />
        </div>

        {/* Timeline */}
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-notion-muted">Aucune entrée.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((e) => (
              <JournalEntry key={e.id} entry={e} links={relations.filter((r) => r.source === e.id && r.type === 'link').map((r) => entities[r.target]).filter(Boolean)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function JournalEntry({ entry, links }: { entry: Entity; links: Entity[] }) {
  const kindLabel = KINDS.find((k) => k.id === entry.props.kind)?.label ?? 'Note';
  return (
    <div className="rounded-lg border border-notion-border bg-white p-3 shadow-sm dark:border-notion-border-dark dark:bg-[#202020]">
      <div className="mb-1 flex items-center gap-2 text-xs text-notion-muted">
        <span className="rounded bg-notion-hover px-1.5 py-0.5 dark:bg-notion-hover-dark">{kindLabel}</span>
        <span>{entry.props.date as string}</span>
      </div>
      <div className="whitespace-pre-wrap text-sm">{entry.props.text as string}</div>
      {links.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-notion-muted">
          <Link2 size={12} />
          {links.map((l) => (
            <span key={l.id} className="rounded bg-notion-hover px-1.5 py-0.5 dark:bg-notion-hover-dark">{l.title || 'Sans titre'}</span>
          ))}
        </div>
      )}
    </div>
  );
}
