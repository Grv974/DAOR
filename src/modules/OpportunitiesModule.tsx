import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useEntityStore } from '@/store/useEntityStore';
import { OPP_STAGES, type OppStage } from '@/types/aura';

export function OpportunitiesModule() {
  const entities = useEntityStore((s) => s.entities);
  const createEntity = useEntityStore((s) => s.createEntity);
  const updateEntity = useEntityStore((s) => s.updateEntity);
  const updateProps = useEntityStore((s) => s.updateProps);
  const deleteEntity = useEntityStore((s) => s.deleteEntity);
  const opportunities = useMemo(
    () => Object.values(entities).filter((e) => e.type === 'opportunity' && !e.archived),
    [entities],
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const byStage = (stage: OppStage) => opportunities.filter((o) => (o.props.stage as OppStage) === stage);

  const metrics = useMemo(() => {
    const open = opportunities.filter((o) => !['won', 'lost'].includes(o.props.stage as string));
    const weighted = open.reduce((s, o) => s + ((o.props.value as number) || 0) * (((o.props.probability as number) || 0) / 100), 0);
    const won = byStage('won').length;
    const lost = byStage('lost').length;
    const conversion = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;
    const stagnant = open.filter((o) => Date.now() - o.updatedAt > 30 * 864e5).length;
    return { weighted, conversion, stagnant, openCount: open.length };
  }, [opportunities]);

  const create = async (stage: OppStage) => {
    const id = await createEntity('opportunity', {
      title: 'Nouvelle opportunité',
      props: { stage, value: 0, probability: 50, category: 'Professionnel' },
    });
    setSelected(id);
  };

  const drop = (stage: OppStage) => {
    if (dragId) updateProps(dragId, { stage });
    setDragId(null);
  };

  const sel = selected ? entities[selected] : undefined;

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 px-6 py-4">
          <h1 className="text-2xl font-bold">Opportunités</h1>
          <button type="button" onClick={() => void create('identified')} className="ml-auto flex items-center gap-1 rounded-md bg-notion-accent px-3 py-1.5 text-sm font-medium text-white">
            <Plus size={15} /> Opportunité
          </button>
        </div>

        {/* Metrics */}
        <div className="flex flex-wrap gap-4 px-6 pb-3 text-sm">
          <Metric label="Pipeline pondéré" value={`${Math.round(metrics.weighted).toLocaleString('fr-FR')} €`} />
          <Metric label="Taux de conversion" value={`${metrics.conversion} %`} />
          <Metric label="Ouvertes" value={String(metrics.openCount)} />
          <Metric label="Stagnantes (>30j)" value={String(metrics.stagnant)} warn={metrics.stagnant > 0} />
        </div>

        {/* Kanban */}
        <div className="flex flex-1 gap-3 overflow-x-auto px-6 pb-6">
          {OPP_STAGES.map((stage) => {
            const items = byStage(stage.id);
            const colValue = items.reduce((s, o) => s + ((o.props.value as number) || 0), 0);
            return (
              <div
                key={stage.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => drop(stage.id)}
                className="flex w-60 shrink-0 flex-col rounded-md bg-notion-sidebar p-2 dark:bg-notion-sidebar-dark"
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-sm font-medium">{stage.label}</span>
                  <span className="text-xs text-notion-muted">{items.length}</span>
                </div>
                <div className="mb-1 px-1 text-[11px] text-notion-muted">{colValue.toLocaleString('fr-FR')} €</div>
                <div className="flex flex-1 flex-col gap-2">
                  {items.map((o) => (
                    <button
                      key={o.id}
                      draggable
                      onDragStart={() => setDragId(o.id)}
                      onClick={() => setSelected(o.id)}
                      className="cursor-grab rounded-md border border-notion-border bg-white p-2 text-left shadow-sm active:cursor-grabbing dark:border-notion-border-dark dark:bg-[#252525]"
                    >
                      <div className="truncate text-sm font-medium">{o.title || 'Sans titre'}</div>
                      <div className="mt-1 flex items-center justify-between text-xs text-notion-muted">
                        <span>{((o.props.value as number) || 0).toLocaleString('fr-FR')} €</span>
                        <span>{(o.props.probability as number) || 0} %</span>
                      </div>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => void create(stage.id)} className="mt-2 flex items-center gap-1 rounded px-1 py-1 text-xs text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark">
                  <Plus size={13} /> Ajouter
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {sel && selected && (
        <aside className="flex h-full w-80 shrink-0 flex-col gap-3 overflow-y-auto border-l border-notion-border p-4 dark:border-notion-border-dark">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-notion-muted">Opportunité</span>
            <button onClick={() => setSelected(null)} className="rounded p-1 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"><X size={16} /></button>
          </div>
          <input value={sel.title} onChange={(e) => updateEntity(selected, { title: e.target.value })} className="bg-transparent text-lg font-semibold outline-none" placeholder="Titre" />
          <Lbl t="Catégorie"><input value={(sel.props.category as string) ?? ''} onChange={(e) => updateProps(selected, { category: e.target.value })} className={inp} placeholder="Job, mission, deal…" /></Lbl>
          <div className="grid grid-cols-2 gap-2">
            <Lbl t="Valeur (€)"><input type="number" value={(sel.props.value as number) ?? 0} onChange={(e) => updateProps(selected, { value: Number(e.target.value) })} className={inp} /></Lbl>
            <Lbl t="Probabilité (%)"><input type="number" min={0} max={100} value={(sel.props.probability as number) ?? 0} onChange={(e) => updateProps(selected, { probability: Number(e.target.value) })} className={inp} /></Lbl>
          </div>
          <Lbl t="Échéance"><input type="date" value={(sel.props.due as string) ?? ''} onChange={(e) => updateProps(selected, { due: e.target.value })} className={inp} /></Lbl>
          <Lbl t="Prochaine action"><input value={(sel.props.nextAction as string) ?? ''} onChange={(e) => updateProps(selected, { nextAction: e.target.value })} className={inp} placeholder="…" /></Lbl>
          {sel.props.stage === 'lost' && (
            <Lbl t="Motif (perdu)"><input value={(sel.props.lostReason as string) ?? ''} onChange={(e) => updateProps(selected, { lostReason: e.target.value })} className={inp} /></Lbl>
          )}
          {sel.props.stage === 'postponed' && (
            <Lbl t="Date de réveil"><input type="date" value={(sel.props.wakeDate as string) ?? ''} onChange={(e) => updateProps(selected, { wakeDate: e.target.value })} className={inp} /></Lbl>
          )}
          <button onClick={() => { if (confirm('Supprimer ?')) { void deleteEntity(selected); setSelected(null); } }} className="mt-2 self-start text-xs text-red-600">Supprimer</button>
        </aside>
      )}
    </div>
  );
}

const inp = 'w-full rounded border border-notion-border bg-transparent px-2 py-1 text-sm outline-none dark:border-notion-border-dark';

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div className={`text-lg font-semibold ${warn ? 'text-amber-600' : ''}`}>{value}</div>
      <div className="text-xs text-notion-muted">{label}</div>
    </div>
  );
}

function Lbl({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-notion-muted">{t}</div>
      {children}
    </div>
  );
}
