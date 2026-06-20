import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Compass, GripVertical, Pencil, Plus, Send, Target, Users, Wallet, X } from 'lucide-react';
import { useEntityStore } from '@/store/useEntityStore';
import { HORIZON_LABELS } from '@/types/aura';
import { ProgressBar } from '@/components/aura/ProgressBar';
import { daysSince, isOverdueCadence } from '@/lib/aura/crm';

const STORE_KEY = 'daor:dashboard';
const DEFAULT_ORDER = ['focus', 'boussole', 'pipeline', 'reseau', 'echeances', 'promesses', 'journal'];

interface DashConfig {
  order: string[];
  hidden: string[];
}

function loadConfig(): DashConfig {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as DashConfig;
  } catch {
    /* ignore */
  }
  return { order: DEFAULT_ORDER, hidden: [] };
}

function saveConfig(c: DashConfig) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
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
  const [config, setConfig] = useState<DashConfig>(loadConfig);
  const [editMode, setEditMode] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const update = (c: DashConfig) => {
    setConfig(c);
    saveConfig(c);
  };

  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

  const tasks = byType('task');
  const focus = useMemo(
    () =>
      tasks
        .filter((t) => t.props.status !== 'done')
        .sort((a, b) => ['critical', 'high', 'medium', 'low'].indexOf((a.props.priority as string) || 'medium') - ['critical', 'high', 'medium', 'low'].indexOf((b.props.priority as string) || 'medium'))
        .slice(0, 3),
    [tasks],
  );
  const boussole = [...byType('objective').filter((o) => o.props.horizon === 'annual'), ...byType('objective').filter((o) => o.props.horizon === 'quarter')].slice(0, 4);
  const deadlines = useMemo(
    () =>
      [...byType('task'), ...byType('project'), ...byType('objective')]
        .filter((e) => { const d = e.props.due as string | undefined; return d && d >= today && d <= in7 && e.props.status !== 'done'; })
        .sort((a, b) => String(a.props.due).localeCompare(String(b.props.due)))
        .slice(0, 6),
    [entities],
  );
  const contacts = byType('contact');
  const toWarm = useMemo(
    () =>
      contacts
        .map((c) => { const last = interactions.filter((i) => i.contactId === c.id).map((i) => i.date).sort().at(-1); return { c, days: last ? daysSince(last) : null, cadence: (c.props.cadence as number) ?? 90 }; })
        .filter((x) => isOverdueCadence(x.days, x.cadence))
        .sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999))
        .slice(0, 5),
    [contacts, interactions],
  );
  const opportunities = byType('opportunity').filter((o) => !['won', 'lost'].includes(o.props.stage as string));
  const weighted = opportunities.reduce((s, o) => s + ((o.props.value as number) || 0) * (((o.props.probability as number) || 0) / 100), 0);
  const openCommitments = commitments.filter((c) => !c.done);

  const addQuickNote = async () => {
    if (!quickNote.trim()) return;
    await createEntity('journal', { title: quickNote.trim(), props: { kind: 'note', date: today, text: quickNote.trim() } });
    setQuickNote('');
  };

  const WIDGETS: Record<string, { title: string; icon: React.ReactNode; body: React.ReactNode }> = {
    focus: { title: 'Focus du jour', icon: <Target size={16} className="text-notion-accent" />, body: focus.length === 0 ? <Empty>Aucune tâche prioritaire.</Empty> : <ul className="space-y-1.5">{focus.map((t) => <li key={t.id} className="flex items-center gap-2 text-sm"><span className="h-3.5 w-3.5 rounded-sm border border-notion-muted" /><span className="truncate">{t.title || 'Sans titre'}</span></li>)}</ul> },
    boussole: { title: 'Boussole', icon: <Compass size={16} className="text-notion-accent" />, body: boussole.length === 0 ? <Empty>Définissez des objectifs.</Empty> : <div className="space-y-2.5">{boussole.map((o) => <div key={o.id}><div className="mb-0.5 flex items-center justify-between text-xs"><span className="truncate">{o.title || 'Sans titre'}</span><span className="text-notion-muted">{HORIZON_LABELS[(o.props.horizon as 'annual') || 'annual']}</span></div><ProgressBar value={progressOf(o.id)} showPct={false} /></div>)}</div> },
    pipeline: { title: 'Pipeline', icon: <Wallet size={16} className="text-notion-accent" />, body: opportunities.length === 0 ? <Empty>Aucune opportunité ouverte.</Empty> : <div><div className="text-2xl font-bold">{Math.round(weighted).toLocaleString('fr-FR')} €</div><div className="text-xs text-notion-muted">pondéré · {opportunities.length} ouverte(s)</div><button onClick={() => navigate('/m/opportunities')} className="mt-2 text-xs text-notion-accent">Voir le pipeline →</button></div> },
    reseau: { title: 'Réseau à réchauffer', icon: <Users size={16} className="text-notion-accent" />, body: toWarm.length === 0 ? <Empty>Réseau à jour 🎉</Empty> : <ul className="space-y-1">{toWarm.map(({ c, days }) => <li key={c.id} className="flex items-center justify-between text-sm"><button onClick={() => navigate('/m/crm')} className="truncate text-left hover:underline">{c.title || 'Sans nom'}</button><span className="shrink-0 text-xs text-amber-600">{days ?? '—'} j</span></li>)}</ul> },
    echeances: { title: 'Échéances (7 j)', icon: <CalendarClock size={16} className="text-notion-accent" />, body: deadlines.length === 0 ? <Empty>Rien à l'horizon.</Empty> : <ul className="space-y-1">{deadlines.map((d) => <li key={d.id} className="flex items-center justify-between text-sm"><span className="truncate">{d.title || 'Sans titre'}</span><span className="shrink-0 text-xs text-notion-muted">{String(d.props.due).slice(5)}</span></li>)}</ul> },
    promesses: { title: 'Promesses & demandes', icon: <Send size={16} className="text-notion-accent" />, body: openCommitments.length === 0 ? <Empty>Aucun engagement ouvert.</Empty> : <ul className="space-y-1">{openCommitments.slice(0, 5).map((c) => <li key={c.id} className="flex items-center gap-1.5 text-sm"><span className={c.direction === 'promise' ? 'text-blue-500' : 'text-green-600'}>{c.direction === 'promise' ? '↑' : '↓'}</span><span className="truncate">{c.text}</span></li>)}</ul> },
    journal: { title: 'Journal express', icon: <Pencil size={16} className="text-notion-accent" />, body: <div className="flex items-center gap-2"><input value={quickNote} onChange={(e) => setQuickNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addQuickNote()} placeholder="Note du jour…" className="flex-1 bg-transparent text-sm outline-none" /><button onClick={addQuickNote} className="rounded bg-notion-accent px-2 py-1 text-xs font-medium text-white">+</button></div> },
  };

  const visible = config.order.filter((id) => WIDGETS[id] && !config.hidden.includes(id));
  const hiddenAvailable = Object.keys(WIDGETS).filter((id) => !visible.includes(id));

  const reorder = (target: string) => {
    if (!dragId || dragId === target) return;
    const order = [...config.order];
    const from = order.indexOf(dragId);
    const to = order.indexOf(target);
    order.splice(from, 1);
    order.splice(to, 0, dragId);
    update({ ...config, order });
    setDragId(null);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="mb-1 flex items-center gap-3">
          <h1 className="text-2xl font-bold">{greeting}</h1>
          <button onClick={() => setEditMode((v) => !v)} className={`ml-auto flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${editMode ? 'border-notion-accent bg-notion-accent text-white' : 'border-notion-border dark:border-notion-border-dark'}`}>
            <Pencil size={12} /> {editMode ? 'Terminer' : 'Personnaliser'}
          </button>
        </div>
        <p className="mb-6 text-sm capitalize text-notion-muted">{dateLabel}</p>

        {editMode && hiddenAvailable.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-notion-border p-2 text-xs dark:border-notion-border-dark">
            <span className="text-notion-muted">Ajouter :</span>
            {hiddenAvailable.map((id) => (
              <button key={id} onClick={() => update({ ...config, hidden: config.hidden.filter((h) => h !== id), order: config.order.includes(id) ? config.order : [...config.order, id] })} className="flex items-center gap-1 rounded bg-notion-hover px-2 py-1 dark:bg-notion-hover-dark">
                <Plus size={11} /> {WIDGETS[id].title}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {visible.map((id) => {
            const w = WIDGETS[id];
            return (
              <div
                key={id}
                draggable={editMode}
                onDragStart={(e) => { if (editMode) { setDragId(id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); } }}
                onDragOver={(e) => editMode && e.preventDefault()}
                onDrop={() => reorder(id)}
                className={`rounded-xl border border-notion-border bg-white p-4 shadow-sm dark:border-notion-border-dark dark:bg-[#202020] ${editMode ? 'cursor-grab ring-1 ring-dashed ring-notion-border' : ''}`}
              >
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  {editMode && <GripVertical size={14} className="text-notion-muted" />}
                  {w.icon} {w.title}
                  {editMode && (
                    <button onClick={() => update({ ...config, hidden: [...config.hidden, id] })} className="ml-auto text-notion-muted hover:text-red-600"><X size={14} /></button>
                  )}
                </div>
                {w.body}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-notion-muted">{children}</p>;
}
