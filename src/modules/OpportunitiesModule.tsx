import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useEntityStore } from '@/store/useEntityStore';
import { OPP_STAGES, type Entity, type OppStage } from '@/types/aura';

type ValueType = 'monetary' | 'career' | 'influence' | 'learning' | 'other';

const VALUE_TYPES: { id: ValueType; label: string }[] = [
  { id: 'monetary', label: 'Monétaire (€)' },
  { id: 'career', label: 'Emploi / carrière' },
  { id: 'influence', label: 'Influence / réseau' },
  { id: 'learning', label: 'Apprentissage' },
  { id: 'other', label: 'Autre' },
];

function valueLabel(o: Entity): string {
  const type = (o.props.valueType as ValueType) ?? 'monetary';
  if (type === 'monetary') return `${((o.props.value as number) || 0).toLocaleString('fr-FR')} €`;
  const label = (o.props.valueLabel as string) || VALUE_TYPES.find((v) => v.id === type)?.label || '';
  return label;
}

export function OpportunitiesModule() {
  const entities = useEntityStore((s) => s.entities);
  const relations = useEntityStore((s) => s.relations);
  const createEntity = useEntityStore((s) => s.createEntity);
  const updateEntity = useEntityStore((s) => s.updateEntity);
  const updateProps = useEntityStore((s) => s.updateProps);
  const deleteEntity = useEntityStore((s) => s.deleteEntity);
  const setParent = useEntityStore((s) => s.setParent);
  const [dragId, setDragId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const opportunities = useMemo(
    () => Object.values(entities).filter((e) => e.type === 'opportunity' && !e.archived),
    [entities],
  );
  // Entities an opportunity can be attached to (cascade).
  const parents = useMemo(
    () => Object.values(entities).filter((e) => ['vision', 'objective', 'project'].includes(e.type) && !e.archived),
    [entities],
  );

  const byStage = (stage: OppStage) => opportunities.filter((o) => (o.props.stage as OppStage) === stage);

  const metrics = useMemo(() => {
    const open = opportunities.filter((o) => !['won', 'lost'].includes(o.props.stage as string));
    const weighted = open
      .filter((o) => ((o.props.valueType as ValueType) ?? 'monetary') === 'monetary')
      .reduce((s, o) => s + ((o.props.value as number) || 0) * (((o.props.probability as number) || 0) / 100), 0);
    const nonMonetary = open.filter((o) => ((o.props.valueType as ValueType) ?? 'monetary') !== 'monetary').length;
    const won = byStage('won').length;
    const lost = byStage('lost').length;
    const conversion = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;
    const stagnant = open.filter((o) => Date.now() - o.updatedAt > 30 * 864e5).length;
    return { weighted, nonMonetary, conversion, stagnant, openCount: open.length };
  }, [opportunities]);

  const create = async (stage: OppStage) => {
    const id = await createEntity('opportunity', {
      title: 'Nouvelle opportunité',
      props: { stage, valueType: 'monetary', value: 0, probability: 50, category: 'Professionnel' },
    });
    setSelected(id);
  };

  const drop = (stage: OppStage) => {
    if (dragId) updateProps(dragId, { stage });
    setDragId(null);
  };

  const sel = selected ? entities[selected] : undefined;
  const selParent = useMemo(() => {
    if (!selected) return undefined;
    const rel = relations.find((r) => r.type === 'parent' && r.source === selected);
    return rel?.target;
  }, [selected, relations]);

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 px-6 py-4">
          <h1 className="text-2xl font-bold">Opportunités</h1>
          <button type="button" onClick={() => void create('identified')} className="ml-auto flex items-center gap-1 rounded-md bg-notion-accent px-3 py-1.5 text-sm font-medium text-white">
            <Plus size={15} /> Opportunité
          </button>
        </div>

        <div className="flex flex-wrap gap-4 px-6 pb-3 text-sm">
          <Metric label="Pipeline pondéré (€)" value={`${Math.round(metrics.weighted).toLocaleString('fr-FR')} €`} />
          <Metric label="Non monétaires" value={String(metrics.nonMonetary)} />
          <Metric label="Taux de conversion" value={`${metrics.conversion} %`} />
          <Metric label="Ouvertes" value={String(metrics.openCount)} />
          <Metric label="Stagnantes (>30j)" value={String(metrics.stagnant)} warn={metrics.stagnant > 0} />
        </div>

        <div className="flex flex-1 gap-3 overflow-x-auto px-6 pb-6">
          {OPP_STAGES.map((stage) => {
            const items = byStage(stage.id);
            return (
              <div
                key={stage.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={() => drop(stage.id)}
                className="flex w-60 shrink-0 flex-col rounded-md bg-notion-sidebar p-2 dark:bg-notion-sidebar-dark"
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-sm font-medium">{stage.label}</span>
                  <span className="text-xs text-notion-muted">{items.length}</span>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  {items.map((o) => (
                    <div
                      key={o.id}
                      draggable
                      onDragStart={(e) => {
                        setDragId(o.id);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', o.id);
                      }}
                      onClick={() => setSelected(o.id)}
                      className="cursor-grab rounded-md border border-notion-border bg-white p-2 text-left shadow-sm active:cursor-grabbing dark:border-notion-border-dark dark:bg-[#252525]"
                    >
                      <div className="truncate text-sm font-medium">{o.title || 'Sans titre'}</div>
                      <div className="mt-1 flex items-center justify-between text-xs text-notion-muted">
                        <span className="truncate">{valueLabel(o)}</span>
                        <span className="shrink-0">{(o.props.probability as number) || 0} %</span>
                      </div>
                    </div>
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
        <aside className="fixed inset-0 z-30 flex h-full w-full shrink-0 flex-col gap-3 overflow-y-auto border-l border-notion-border bg-notion-bg p-4 dark:border-notion-border-dark dark:bg-notion-bg-dark md:static md:z-auto md:w-80 md:bg-transparent dark:md:bg-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-notion-muted">Opportunité</span>
            <button onClick={() => setSelected(null)} className="rounded p-1 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"><X size={16} /></button>
          </div>
          <input value={sel.title} onChange={(e) => updateEntity(selected, { title: e.target.value })} className="bg-transparent text-lg font-semibold outline-none" placeholder="Titre" />

          <Lbl t="Étape">
            <select value={sel.props.stage as string} onChange={(e) => updateProps(selected, { stage: e.target.value })} className={inp}>
              {OPP_STAGES.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
            </select>
          </Lbl>

          <Lbl t="Nature de la valeur">
            <select value={(sel.props.valueType as ValueType) ?? 'monetary'} onChange={(e) => updateProps(selected, { valueType: e.target.value })} className={inp}>
              {VALUE_TYPES.map((v) => (<option key={v.id} value={v.id}>{v.label}</option>))}
            </select>
          </Lbl>

          {((sel.props.valueType as ValueType) ?? 'monetary') === 'monetary' ? (
            <Lbl t="Valeur (€)"><input type="number" value={(sel.props.value as number) ?? 0} onChange={(e) => updateProps(selected, { value: Number(e.target.value) })} className={inp} /></Lbl>
          ) : (
            <Lbl t="Valeur (description)"><input value={(sel.props.valueLabel as string) ?? ''} onChange={(e) => updateProps(selected, { valueLabel: e.target.value })} className={inp} placeholder="ex. poste de CFO, intro stratégique…" /></Lbl>
          )}

          <Lbl t="Probabilité (%)"><input type="number" min={0} max={100} value={(sel.props.probability as number) ?? 0} onChange={(e) => updateProps(selected, { probability: Number(e.target.value) })} className={inp} /></Lbl>

          <Lbl t="Rattaché à (objectif / projet)">
            <select
              value={selParent ?? ''}
              onChange={(e) => setParent(selected, e.target.value || null)}
              className={inp}
            >
              <option value="">— Aucun —</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.type === 'vision' ? '✦ ' : p.type === 'project' ? '📁 ' : '◎ '}
                  {p.title || 'Sans titre'}
                </option>
              ))}
            </select>
          </Lbl>

          <Lbl t="Catégorie"><input value={(sel.props.category as string) ?? ''} onChange={(e) => updateProps(selected, { category: e.target.value })} className={inp} placeholder="Job, mission, deal…" /></Lbl>
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
