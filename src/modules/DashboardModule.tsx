import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Compass, Send, Target, Users, Wallet } from 'lucide-react';
import { useEntityStore } from '@/store/useEntityStore';
import { HORIZON_LABELS } from '@/types/aura';
import { ProgressBar } from '@/components/aura/ProgressBar';
import { daysSince, isOverdueCadence } from '@/lib/aura/crm';

function Widget({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-notion-border bg-white p-4 shadow-sm dark:border-notion-border-dark dark:bg-[#202020]">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

export function DashboardModule() {
  const navigate = useNavigate();
  const entities = useEntityStore((s) => s.entities);
  const byType = useEntityStore((s) => s.byType);
  const progressOf = useEntityStore((s) => s.progressOf);
  const createEntity = useEntityStore((s) => s.createEntity);
  const interactions = useEntityStore((s) => s.interactions);
  const commitments = useEntityStore((s) => s.commitments);
  const [quickNote, setQuickNote] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

  const tasks = byType('task');
  const focus = useMemo(
    () =>
      tasks
        .filter((t) => t.props.status !== 'done')
        .sort((a, b) => {
          const pa = ['critical', 'high', 'medium', 'low'].indexOf((a.props.priority as string) || 'medium');
          const pb = ['critical', 'high', 'medium', 'low'].indexOf((b.props.priority as string) || 'medium');
          return pa - pb;
        })
        .slice(0, 3),
    [tasks],
  );

  const quarterObjectives = byType('objective').filter((o) => o.props.horizon === 'quarter');
  const annualObjectives = byType('objective').filter((o) => o.props.horizon === 'annual');
  const boussole = [...annualObjectives, ...quarterObjectives].slice(0, 4);

  const deadlines = useMemo(
    () =>
      [...byType('task'), ...byType('project'), ...byType('objective')]
        .filter((e) => {
          const d = e.props.due as string | undefined;
          return d && d >= today && d <= in7 && e.props.status !== 'done';
        })
        .sort((a, b) => String(a.props.due).localeCompare(String(b.props.due)))
        .slice(0, 6),
    [entities],
  );

  const contacts = byType('contact');
  const toWarm = useMemo(
    () =>
      contacts
        .map((c) => {
          const last = interactions
            .filter((i) => i.contactId === c.id)
            .map((i) => i.date)
            .sort()
            .at(-1);
          return { c, days: last ? daysSince(last) : null, cadence: (c.props.cadence as number) ?? 90 };
        })
        .filter((x) => isOverdueCadence(x.days, x.cadence))
        .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999))
        .slice(0, 5),
    [contacts, interactions],
  );

  const opportunities = byType('opportunity').filter((o) => !['won', 'lost'].includes(o.props.stage as string));
  const weighted = opportunities.reduce(
    (sum, o) => sum + ((o.props.value as number) || 0) * (((o.props.probability as number) || 0) / 100),
    0,
  );

  const openCommitments = commitments.filter((c) => !c.done);

  const addQuickNote = async () => {
    if (!quickNote.trim()) return;
    await createEntity('journal', { title: quickNote.trim(), props: { kind: 'note', date: today } });
    setQuickNote('');
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <h1 className="mb-1 text-2xl font-bold">{greeting}</h1>
        <p className="mb-6 text-sm capitalize text-notion-muted">{dateLabel}</p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Widget title="Focus du jour" icon={<Target size={16} className="text-notion-accent" />}>
            {focus.length === 0 ? (
              <Empty>Aucune tâche prioritaire.</Empty>
            ) : (
              <ul className="space-y-1.5">
                {focus.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    <span className="h-3.5 w-3.5 rounded-sm border border-notion-muted" />
                    <span className="truncate">{t.title || 'Sans titre'}</span>
                  </li>
                ))}
              </ul>
            )}
          </Widget>

          <Widget title="Boussole" icon={<Compass size={16} className="text-notion-accent" />}>
            {boussole.length === 0 ? (
              <Empty>Définissez des objectifs.</Empty>
            ) : (
              <div className="space-y-2.5">
                {boussole.map((o) => (
                  <div key={o.id}>
                    <div className="mb-0.5 flex items-center justify-between text-xs">
                      <span className="truncate">{o.title || 'Sans titre'}</span>
                      <span className="text-notion-muted">{HORIZON_LABELS[(o.props.horizon as 'annual') || 'annual']}</span>
                    </div>
                    <ProgressBar value={progressOf(o.id)} showPct={false} />
                  </div>
                ))}
              </div>
            )}
          </Widget>

          <Widget title="Pipeline" icon={<Wallet size={16} className="text-notion-accent" />}>
            {opportunities.length === 0 ? (
              <Empty>Aucune opportunité ouverte.</Empty>
            ) : (
              <div>
                <div className="text-2xl font-bold">{Math.round(weighted).toLocaleString('fr-FR')} €</div>
                <div className="text-xs text-notion-muted">pondéré · {opportunities.length} ouverte(s)</div>
                <button onClick={() => navigate('/m/opportunities')} className="mt-2 text-xs text-notion-accent">
                  Voir le pipeline →
                </button>
              </div>
            )}
          </Widget>

          <Widget title="Réseau à réchauffer" icon={<Users size={16} className="text-notion-accent" />}>
            {toWarm.length === 0 ? (
              <Empty>Réseau à jour 🎉</Empty>
            ) : (
              <ul className="space-y-1">
                {toWarm.map(({ c, days }) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <button onClick={() => navigate('/m/crm')} className="truncate text-left hover:underline">
                      {c.title || 'Sans nom'}
                    </button>
                    <span className="shrink-0 text-xs text-amber-600">{days ?? '—'} j</span>
                  </li>
                ))}
              </ul>
            )}
          </Widget>

          <Widget title="Échéances (7 j)" icon={<CalendarClock size={16} className="text-notion-accent" />}>
            {deadlines.length === 0 ? (
              <Empty>Rien à l'horizon.</Empty>
            ) : (
              <ul className="space-y-1">
                {deadlines.map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{d.title || 'Sans titre'}</span>
                    <span className="shrink-0 text-xs text-notion-muted">{String(d.props.due).slice(5)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Widget>

          <Widget title="Promesses & demandes" icon={<Send size={16} className="text-notion-accent" />}>
            {openCommitments.length === 0 ? (
              <Empty>Aucun engagement ouvert.</Empty>
            ) : (
              <ul className="space-y-1">
                {openCommitments.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center gap-1.5 text-sm">
                    <span className={c.direction === 'promise' ? 'text-blue-500' : 'text-green-600'}>
                      {c.direction === 'promise' ? '↑' : '↓'}
                    </span>
                    <span className="truncate">{c.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </Widget>
        </div>

        {/* Journal express */}
        <div className="mt-4 rounded-xl border border-notion-border bg-white p-3 shadow-sm dark:border-notion-border-dark dark:bg-[#202020]">
          <div className="flex items-center gap-2">
            <input
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addQuickNote()}
              placeholder="Note rapide du jour… (Entrée pour enregistrer)"
              className="flex-1 bg-transparent text-sm outline-none"
            />
            <button onClick={addQuickNote} className="rounded-md bg-notion-accent px-3 py-1 text-xs font-medium text-white">
              Ajouter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-notion-muted">{children}</p>;
}
