import { useMemo } from 'react';
import { useEntityStore } from '@/store/useEntityStore';

interface TLEvent {
  date: string;
  label: string;
  color: string;
}

/** Relationship time-machine: a chronological frieze of a contact's history. */
export function TimeMachine({ contactId }: { contactId: string }) {
  const interactions = useEntityStore((s) => s.interactions);
  const commitments = useEntityStore((s) => s.commitments);
  const relations = useEntityStore((s) => s.relations);
  const entities = useEntityStore((s) => s.entities);

  const events = useMemo<TLEvent[]>(() => {
    const out: TLEvent[] = [];
    for (const i of interactions.filter((x) => x.contactId === contactId)) {
      out.push({ date: i.date, label: `${i.kind} — ${i.summary}`, color: '#2383e2' });
    }
    for (const c of commitments.filter((x) => x.contactId === contactId)) {
      const d = new Date(c.createdAt).toISOString().slice(0, 10);
      out.push({ date: d, label: `${c.direction === 'promise' ? 'Promesse' : 'Demande'} : ${c.text}`, color: c.direction === 'promise' ? '#8b5cf6' : '#22a06b' });
    }
    for (const r of relations.filter((x) => x.source === contactId || x.target === contactId)) {
      const other = entities[r.source === contactId ? r.target : r.source];
      if (other?.type === 'opportunity') {
        const d = new Date(other.createdAt).toISOString().slice(0, 10);
        out.push({ date: d, label: `Opportunité : ${other.title || 'Sans titre'}`, color: '#e0883a' });
      }
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  }, [interactions, commitments, relations, entities, contactId]);

  if (events.length === 0) {
    return <p className="text-xs text-notion-muted">Pas encore d'événements à retracer.</p>;
  }

  const min = new Date(events[0].date).getTime();
  const max = new Date(events[events.length - 1].date).getTime();
  const span = Math.max(1, max - min);

  return (
    <div className="pt-2">
      {/* Frieze */}
      <div className="relative mb-3 h-10">
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-notion-border dark:bg-notion-border-dark" />
        {events.map((e, i) => {
          const x = ((new Date(e.date).getTime() - min) / span) * 100;
          return (
            <div key={i} className="group absolute -translate-x-1/2" style={{ left: `${x}%`, top: 12 }}>
              <div className="h-3 w-3 rounded-full ring-2 ring-white dark:ring-[#202020]" style={{ background: e.color }} title={`${e.date} — ${e.label}`} />
            </div>
          );
        })}
        <span className="absolute left-0 top-0 text-[10px] text-notion-muted">{events[0].date}</span>
        <span className="absolute right-0 top-0 text-[10px] text-notion-muted">{events[events.length - 1].date}</span>
      </div>
      {/* Chronological list */}
      <div className="space-y-1">
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.color }} />
            <span className="w-20 shrink-0 text-notion-muted">{e.date}</span>
            <span className="truncate">{e.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
