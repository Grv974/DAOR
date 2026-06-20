import { useEffect, useMemo, useRef, useState } from 'react';
import { Flag, Plus, X } from 'lucide-react';
import { useEntityStore } from '@/store/useEntityStore';
import type { Entity } from '@/types/aura';

const DAY_W = 26;
const DAY = 864e5;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s?: string) => (s ? new Date(s + 'T00:00:00').getTime() : NaN);
const addDays = (s: string, n: number) => iso(new Date(parse(s) + n * DAY));
const dayDiff = (a: number, b: number) => Math.round((a - b) / DAY);

export function ProjectsModule() {
  const entities = useEntityStore((s) => s.entities);
  const createEntity = useEntityStore((s) => s.createEntity);
  const setParent = useEntityStore((s) => s.setParent);
  const childrenOf = useEntityStore((s) => s.childrenOf);
  const [selected, setSelected] = useState<string | null>(null);

  const projects = useMemo(
    () => Object.values(entities).filter((e) => e.type === 'project' && !e.archived),
    [entities],
  );

  const addProject = async () => {
    const id = await createEntity('project', { title: 'Nouveau projet', props: { priority: 'medium' } });
    setSelected(id);
  };

  const addTask = async (projectId: string) => {
    const start = iso(new Date());
    const id = await createEntity('task', { title: 'Nouvelle tâche', props: { status: 'todo', start, due: addDays(start, 3), hours: 8 } });
    setParent(id, projectId);
  };

  const tasks = selected ? childrenOf(selected).filter((c) => c.type === 'task') : [];

  return (
    <div className="flex h-full">
      <div className="flex w-60 shrink-0 flex-col border-r border-notion-border dark:border-notion-border-dark">
        <div className="flex items-center gap-2 px-3 py-3">
          <h1 className="text-lg font-bold">Projets</h1>
          <button onClick={addProject} className="ml-auto rounded-md bg-notion-accent px-2 py-1 text-xs font-medium text-white"><Plus size={13} className="inline" /> Projet</button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {projects.length === 0 && <p className="px-2 text-sm text-notion-muted">Aucun projet.</p>}
          {projects.map((p) => (
            <button key={p.id} onClick={() => setSelected(p.id)} className={`block w-full truncate rounded px-2 py-1.5 text-left text-sm ${selected === p.id ? 'bg-notion-hover dark:bg-notion-hover-dark' : 'hover:bg-notion-hover dark:hover:bg-notion-hover-dark'}`}>
              {p.title || 'Sans titre'}
            </button>
          ))}
        </div>
      </div>

      {!selected ? (
        <div className="flex flex-1 items-center justify-center text-sm text-notion-muted">Sélectionnez un projet.</div>
      ) : (
        <ProjectBoard key={selected} projectId={selected} tasks={tasks} onAddTask={() => addTask(selected)} />
      )}
    </div>
  );
}

function ProjectBoard({ projectId, tasks, onAddTask }: { projectId: string; tasks: Entity[]; onAddTask: () => void }) {
  const entities = useEntityStore((s) => s.entities);
  const project = entities[projectId];
  const updateProps = useEntityStore((s) => s.updateProps);
  const updateEntity = useEntityStore((s) => s.updateEntity);
  const deleteEntity = useEntityStore((s) => s.deleteEntity);
  const [editTask, setEditTask] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; startX: number; delta: number } | null>(null);
  const dragRef = useRef(drag);
  dragRef.current = drag;

  // Time range.
  const dated = tasks.filter((t) => t.props.start && t.props.due);
  const starts = dated.map((t) => parse(t.props.start as string));
  const dues = dated.map((t) => parse(t.props.due as string));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const rangeStart = (starts.length ? Math.min(...starts) : today.getTime()) - 3 * DAY;
  const rangeEnd = (dues.length ? Math.max(...dues) : today.getTime() + 30 * DAY) + 3 * DAY;
  const totalDays = Math.max(14, dayDiff(rangeEnd, rangeStart));
  const dayX = (t: number) => dayDiff(t, rangeStart) * DAY_W;

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragRef.current) setDrag((d) => (d ? { ...d, delta: Math.round((e.clientX - d.startX) / DAY_W) } : d));
    };
    const onUp = () => {
      const d = dragRef.current;
      if (d && d.delta !== 0) {
        const t = entities[d.id];
        if (t?.props.start && t.props.due) {
          updateProps(d.id, { start: addDays(t.props.start as string, d.delta), due: addDays(t.props.due as string, d.delta) });
        }
      }
      setDrag(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [entities, updateProps]);

  // Month labels.
  const months: { label: string; x: number }[] = [];
  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(rangeStart + i * DAY);
    if (d.getDate() === 1 || i === 0) months.push({ label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }), x: i * DAY_W });
  }

  // Weekly workload.
  const weeks = Math.ceil(totalDays / 7);
  const load: number[] = Array(weeks).fill(0);
  for (const t of dated) {
    const s = parse(t.props.start as string); const e = parse(t.props.due as string);
    const span = Math.max(1, dayDiff(e, s) + 1);
    const perDay = ((t.props.hours as number) || 0) / span;
    for (let d = 0; d < span; d++) { const wk = Math.floor(dayDiff(s + d * DAY, rangeStart) / 7); if (wk >= 0 && wk < weeks) load[wk] += perDay; }
  }

  const risks = (project?.props.risks as { id: string; label: string; prob: number; impact: number }[]) ?? [];
  const et = editTask ? entities[editTask] : undefined;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3">
        <input value={project?.title ?? ''} onChange={(e) => updateEntity(projectId, { title: e.target.value })} className="bg-transparent text-xl font-bold outline-none" />
        <button onClick={onAddTask} className="ml-auto flex items-center gap-1 rounded-md border border-notion-border px-2 py-1 text-xs hover:bg-notion-hover dark:border-notion-border-dark dark:hover:bg-notion-hover-dark"><Plus size={13} /> Tâche</button>
      </div>

      <div className="flex flex-1 overflow-auto">
        {/* Gantt */}
        <div className="min-w-0 flex-1 overflow-x-auto px-6 pb-6">
          <div style={{ width: totalDays * DAY_W + 200 }}>
            {/* Header */}
            <div className="relative h-6 border-b border-notion-border dark:border-notion-border-dark" style={{ marginLeft: 180 }}>
              {months.map((m, i) => (
                <span key={i} className="absolute text-[10px] text-notion-muted" style={{ left: m.x }}>{m.label}</span>
              ))}
            </div>
            {/* Today line */}
            <div className="relative">
              {tasks.length === 0 && <p className="py-6 pl-[180px] text-sm text-notion-muted">Ajoutez des tâches pour construire la roadmap.</p>}
              {tasks.map((t) => {
                const hasDates = Boolean(t.props.start && t.props.due);
                const isMs = Boolean(t.props.isMilestone);
                const s = parse(t.props.start as string);
                const e = parse(t.props.due as string);
                const delta = drag?.id === t.id ? drag.delta : 0;
                const x = (hasDates ? dayX(s) : 0) + delta * DAY_W;
                const w = hasDates ? Math.max(DAY_W, (dayDiff(e, s) + 1) * DAY_W) : DAY_W;
                const done = t.props.status === 'done';
                const blocked = ((t.props.dependsOn as string[]) ?? []).some((d) => entities[d] && entities[d].props.status !== 'done');
                return (
                  <div key={t.id} className="relative flex h-9 items-center">
                    <button onClick={() => setEditTask(t.id)} className="absolute left-0 w-[170px] truncate pr-2 text-left text-sm" title={t.title}>
                      {isMs && <Flag size={11} className="mr-1 inline text-amber-600" />}{t.title || 'Sans titre'}
                    </button>
                    <div className="absolute" style={{ left: 180 }}>
                      {hasDates && (
                        isMs ? (
                          <div onMouseDown={(e2) => setDrag({ id: t.id, startX: e2.clientX, delta: 0 })} className="h-4 w-4 rotate-45 cursor-grab bg-amber-500" style={{ marginLeft: x }} title={t.props.due as string} />
                        ) : (
                          <div
                            onMouseDown={(e2) => setDrag({ id: t.id, startX: e2.clientX, delta: 0 })}
                            onClick={() => setEditTask(t.id)}
                            className={`flex h-5 cursor-grab items-center rounded px-1 text-[10px] text-white active:cursor-grabbing ${blocked ? 'bg-red-400' : done ? 'bg-green-500' : 'bg-notion-accent'}`}
                            style={{ marginLeft: x, width: w }}
                            title={`${t.props.start} → ${t.props.due}`}
                          >
                            <span className="truncate">{(t.props.hours as number) || 0}h</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Weekly workload */}
            {tasks.length > 0 && (
              <div className="mt-4" style={{ marginLeft: 180 }}>
                <div className="mb-1 text-xs font-semibold text-notion-muted">Charge hebdomadaire (h)</div>
                <div className="flex gap-0.5">
                  {load.map((h, i) => (
                    <div key={i} className="text-center" style={{ width: 7 * DAY_W - 2 }}>
                      <div className="flex h-12 items-end justify-center">
                        <div className={`w-6 rounded-t ${h > 40 ? 'bg-red-500' : 'bg-notion-accent'}`} style={{ height: `${Math.min(100, (h / 50) * 100)}%` }} title={`${Math.round(h)} h`} />
                      </div>
                      <div className={`text-[9px] ${h > 40 ? 'text-red-600' : 'text-notion-muted'}`}>{Math.round(h)}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-notion-muted">Alerte de surcharge au-delà de 40 h/semaine.</p>
              </div>
            )}

            {/* Risk register */}
            <div className="mt-6 max-w-md" style={{ marginLeft: 180 }}>
              <div className="mb-1 text-xs font-semibold text-notion-muted">Registre de risques</div>
              {risks.map((r) => (
                <div key={r.id} className="group flex items-center gap-2 py-0.5 text-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${r.prob * r.impact >= 15 ? 'bg-red-500' : r.prob * r.impact >= 8 ? 'bg-amber-500' : 'bg-green-500'}`} />
                  <input value={r.label} onChange={(ev) => updateProps(projectId, { risks: risks.map((x) => x.id === r.id ? { ...x, label: ev.target.value } : x) })} placeholder="Risque" className="flex-1 bg-transparent text-sm outline-none" />
                  <select value={r.prob} onChange={(ev) => updateProps(projectId, { risks: risks.map((x) => x.id === r.id ? { ...x, prob: Number(ev.target.value) } : x) })} className={mini} title="Probabilité">{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select>
                  <select value={r.impact} onChange={(ev) => updateProps(projectId, { risks: risks.map((x) => x.id === r.id ? { ...x, impact: Number(ev.target.value) } : x) })} className={mini} title="Impact">{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select>
                  <button onClick={() => updateProps(projectId, { risks: risks.filter((x) => x.id !== r.id) })} className="text-notion-muted opacity-0 hover:text-red-600 group-hover:opacity-100"><X size={12} /></button>
                </div>
              ))}
              <button onClick={() => updateProps(projectId, { risks: [...risks, { id: `r${Date.now()}`, label: '', prob: 3, impact: 3 }] })} className="mt-1 flex items-center gap-1 text-xs text-notion-accent"><Plus size={12} /> Risque</button>
            </div>
          </div>
        </div>

        {/* Task editor */}
        {et && editTask && (
          <aside className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto border-l border-notion-border p-4 dark:border-notion-border-dark">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-notion-muted">Tâche</span>
              <button onClick={() => setEditTask(null)} className="rounded p-1 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"><X size={16} /></button>
            </div>
            <input value={et.title} onChange={(e) => updateEntity(editTask, { title: e.target.value })} className="bg-transparent text-base font-semibold outline-none" />
            <L t="Statut"><select value={(et.props.status as string) ?? 'todo'} onChange={(e) => updateProps(editTask, { status: e.target.value })} className={inp}><option value="todo">À faire</option><option value="doing">En cours</option><option value="done">Terminé</option></select></L>
            <div className="grid grid-cols-2 gap-2">
              <L t="Début"><input type="date" value={(et.props.start as string) ?? ''} onChange={(e) => updateProps(editTask, { start: e.target.value })} className={inp} /></L>
              <L t="Fin"><input type="date" value={(et.props.due as string) ?? ''} onChange={(e) => updateProps(editTask, { due: e.target.value })} className={inp} /></L>
            </div>
            <L t="Charge (h)"><input type="number" value={(et.props.hours as number) ?? 0} onChange={(e) => updateProps(editTask, { hours: Number(e.target.value) })} className={inp} /></L>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(et.props.isMilestone)} onChange={(e) => updateProps(editTask, { isMilestone: e.target.checked })} /> Jalon (milestone)</label>
            <L t="Dépend de">
              <select multiple value={(et.props.dependsOn as string[]) ?? []} onChange={(e) => updateProps(editTask, { dependsOn: Array.from(e.target.selectedOptions).map((o) => o.value) })} className={`${inp} h-24`}>
                {tasks.filter((x) => x.id !== editTask).map((x) => <option key={x.id} value={x.id}>{x.title || 'Sans titre'}</option>)}
              </select>
            </L>
            <button onClick={() => { if (confirm('Supprimer la tâche ?')) { void deleteEntity(editTask); setEditTask(null); } }} className="self-start text-xs text-red-600">Supprimer</button>
          </aside>
        )}
      </div>
    </div>
  );
}

const inp = 'w-full rounded border border-notion-border bg-transparent px-2 py-1 text-sm outline-none dark:border-notion-border-dark';
const mini = 'rounded border border-notion-border bg-transparent px-1 py-0.5 text-xs outline-none dark:border-notion-border-dark';

function L({ t, children }: { t: string; children: React.ReactNode }) {
  return <div><div className="mb-1 text-xs font-medium text-notion-muted">{t}</div>{children}</div>;
}
