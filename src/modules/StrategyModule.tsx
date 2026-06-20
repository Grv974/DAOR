import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useEntityStore } from '@/store/useEntityStore';
import { ProgressBar } from '@/components/aura/ProgressBar';

interface Risk { id: string; label: string; prob: number; impact: number; mitigation: string }
interface Skill { id: string; name: string; current: number; target: number; plan: string }
interface Plan {
  moyens: string[];
  ressources: string[];
  opportunites: string[];
  dependances: string[];
  risks: Risk[];
  skills: Skill[];
  budgetEstimated: number;
  budgetActual: number;
  timeEstimated: number;
  timeSpent: number;
}

const EMPTY: Plan = {
  moyens: [], ressources: [], opportunites: [], dependances: [],
  risks: [], skills: [], budgetEstimated: 0, budgetActual: 0, timeEstimated: 0, timeSpent: 0,
};

let _id = 0;
const uid = () => `s${Date.now()}${_id++}`;

export function StrategyModule() {
  const entities = useEntityStore((s) => s.entities);
  const updateProps = useEntityStore((s) => s.updateProps);
  const [selected, setSelected] = useState<string | null>(null);

  const objectives = useMemo(
    () => Object.values(entities).filter((e) => (e.type === 'objective' || e.type === 'vision') && !e.archived),
    [entities],
  );

  const obj = selected ? entities[selected] : undefined;
  const plan: Plan = { ...EMPTY, ...((obj?.props.plan as Partial<Plan>) ?? {}) };
  const setPlan = (patch: Partial<Plan>) => selected && updateProps(selected, { plan: { ...plan, ...patch } });

  return (
    <div className="flex h-full">
      <div className={`${selected ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r border-notion-border md:w-64 dark:border-notion-border-dark`}>
        <h1 className="px-4 py-3 text-lg font-bold">Stratégie</h1>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {objectives.length === 0 && <p className="px-2 text-sm text-notion-muted">Créez des objectifs pour bâtir leur plan d'action.</p>}
          {objectives.map((o) => (
            <button key={o.id} onClick={() => setSelected(o.id)} className={`block w-full truncate rounded px-2 py-1.5 text-left text-sm ${selected === o.id ? 'bg-notion-hover dark:bg-notion-hover-dark' : 'hover:bg-notion-hover dark:hover:bg-notion-hover-dark'}`}>
              {o.title || 'Sans titre'}
            </button>
          ))}
        </div>
      </div>

      {!obj ? (
        <div className="flex flex-1 items-center justify-center text-sm text-notion-muted">Sélectionnez un objectif.</div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 py-6">
            <button onClick={() => setSelected(null)} className="mb-2 text-sm text-notion-muted hover:underline md:hidden">← Retour</button>
            <h2 className="mb-4 text-xl font-bold">{obj.title || 'Sans titre'} — Plan d'action</h2>

            <div className="grid gap-5 md:grid-cols-2">
              <ListEditor title="Moyens à mettre en œuvre" items={plan.moyens} onChange={(moyens) => setPlan({ moyens })} />
              <ListEditor title="Ressources nécessaires" items={plan.ressources} onChange={(ressources) => setPlan({ ressources })} />
              <ListEditor title="Opportunités à exploiter" items={plan.opportunites} onChange={(opportunites) => setPlan({ opportunites })} />
              <ListEditor title="Dépendances / pré-requis" items={plan.dependances} onChange={(dependances) => setPlan({ dependances })} />
            </div>

            {/* Risks */}
            <Section title="Risques (probabilité × impact)">
              <div className="flex flex-col gap-4 md:flex-row">
                <RiskMatrix risks={plan.risks} />
                <div className="flex-1 space-y-2">
                  {plan.risks.map((r) => (
                    <div key={r.id} className="rounded border border-notion-border p-2 dark:border-notion-border-dark">
                      <div className="flex items-center gap-1">
                        <input value={r.label} onChange={(e) => setPlan({ risks: plan.risks.map((x) => x.id === r.id ? { ...x, label: e.target.value } : x) })} placeholder="Risque" className={`${inp} flex-1`} />
                        <button onClick={() => setPlan({ risks: plan.risks.filter((x) => x.id !== r.id) })} className="text-notion-muted hover:text-red-600"><X size={13} /></button>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <label>Proba <select value={r.prob} onChange={(e) => setPlan({ risks: plan.risks.map((x) => x.id === r.id ? { ...x, prob: Number(e.target.value) } : x) })} className={mini}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></label>
                        <label>Impact <select value={r.impact} onChange={(e) => setPlan({ risks: plan.risks.map((x) => x.id === r.id ? { ...x, impact: Number(e.target.value) } : x) })} className={mini}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></label>
                      </div>
                      <input value={r.mitigation} onChange={(e) => setPlan({ risks: plan.risks.map((x) => x.id === r.id ? { ...x, mitigation: e.target.value } : x) })} placeholder="Mitigation" className={`${inp} mt-1`} />
                    </div>
                  ))}
                  <button onClick={() => setPlan({ risks: [...plan.risks, { id: uid(), label: '', prob: 3, impact: 3, mitigation: '' }] })} className="flex items-center gap-1 text-xs text-notion-accent"><Plus size={13} /> Risque</button>
                </div>
              </div>
            </Section>

            {/* Skills */}
            <Section title="Compétences à acquérir">
              <div className="space-y-2">
                {plan.skills.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <input value={s.name} onChange={(e) => setPlan({ skills: plan.skills.map((x) => x.id === s.id ? { ...x, name: e.target.value } : x) })} placeholder="Compétence" className={`${inp} w-40`} />
                    <div className="flex-1">
                      <ProgressBar value={s.target ? s.current / s.target : 0} showPct={false} />
                    </div>
                    <span className="text-xs text-notion-muted">niv.</span>
                    <input type="number" min={0} max={5} value={s.current} onChange={(e) => setPlan({ skills: plan.skills.map((x) => x.id === s.id ? { ...x, current: Number(e.target.value) } : x) })} className={`${mini} w-12`} />
                    <span className="text-xs">/</span>
                    <input type="number" min={0} max={5} value={s.target} onChange={(e) => setPlan({ skills: plan.skills.map((x) => x.id === s.id ? { ...x, target: Number(e.target.value) } : x) })} className={`${mini} w-12`} />
                    <button onClick={() => setPlan({ skills: plan.skills.filter((x) => x.id !== s.id) })} className="text-notion-muted hover:text-red-600"><X size={13} /></button>
                  </div>
                ))}
                <button onClick={() => setPlan({ skills: [...plan.skills, { id: uid(), name: '', current: 1, target: 3, plan: '' }] })} className="flex items-center gap-1 text-xs text-notion-accent"><Plus size={13} /> Compétence</button>
              </div>
            </Section>

            {/* Budget & time */}
            <Section title="Budget & temps">
              <div className="grid gap-4 md:grid-cols-2">
                <BudgetBar label="Budget (€)" estimated={plan.budgetEstimated} actual={plan.budgetActual} onEst={(budgetEstimated) => setPlan({ budgetEstimated })} onAct={(budgetActual) => setPlan({ budgetActual })} />
                <BudgetBar label="Temps (h)" estimated={plan.timeEstimated} actual={plan.timeSpent} onEst={(timeEstimated) => setPlan({ timeEstimated })} onAct={(timeSpent) => setPlan({ timeSpent })} />
              </div>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = 'rounded border border-notion-border bg-transparent px-2 py-1 text-sm outline-none dark:border-notion-border-dark';
const mini = 'rounded border border-notion-border bg-transparent px-1 py-0.5 text-xs outline-none dark:border-notion-border-dark';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-6"><h3 className="mb-2 text-sm font-semibold">{title}</h3>{children}</div>;
}

function ListEditor({ title, items, onChange }: { title: string; items: string[]; onChange: (v: string[]) => void }) {
  const [val, setVal] = useState('');
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-notion-muted">{title}</div>
      <div className="space-y-1">
        {items.map((it, i) => (
          <div key={i} className="group flex items-center gap-1 text-sm">
            <span className="text-notion-muted">•</span>
            <span className="flex-1">{it}</span>
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-notion-muted opacity-0 hover:text-red-600 group-hover:opacity-100"><X size={12} /></button>
          </div>
        ))}
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && val.trim()) { onChange([...items, val.trim()]); setVal(''); } }} placeholder="+ ajouter…" className={`${inp} w-full`} />
      </div>
    </div>
  );
}

function RiskMatrix({ risks }: { risks: Risk[] }) {
  // 5×5 grid, impact (rows, top=5) × probability (cols, left=1).
  const cellColor = (p: number, i: number) => {
    const sev = p * i;
    return sev >= 15 ? 'bg-red-400/60' : sev >= 8 ? 'bg-amber-400/50' : 'bg-green-400/40';
  };
  return (
    <div className="shrink-0">
      <div className="grid grid-cols-5 gap-0.5">
        {[5, 4, 3, 2, 1].map((impact) =>
          [1, 2, 3, 4, 5].map((prob) => {
            const here = risks.filter((r) => r.prob === prob && r.impact === impact);
            return (
              <div key={`${prob}-${impact}`} className={`flex h-9 w-9 items-center justify-center rounded text-[10px] ${cellColor(prob, impact)}`} title={`P${prob}×I${impact}`}>
                {here.length > 0 && <span className="font-bold">{here.length}</span>}
              </div>
            );
          }),
        )}
      </div>
      <div className="mt-1 text-center text-[10px] text-notion-muted">Probabilité →</div>
    </div>
  );
}

function BudgetBar({ label, estimated, actual, onEst, onAct }: { label: string; estimated: number; actual: number; onEst: (v: number) => void; onAct: (v: number) => void }) {
  const ratio = estimated ? actual / estimated : 0;
  const over = ratio > 1;
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-notion-muted">{label}</div>
      <div className="mb-1 flex items-center gap-2 text-sm">
        <input type="number" value={actual} onChange={(e) => onAct(Number(e.target.value))} className={`${inp} w-24`} />
        <span className="text-notion-muted">/</span>
        <input type="number" value={estimated} onChange={(e) => onEst(Number(e.target.value))} className={`${inp} w-24`} />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-notion-border dark:bg-notion-border-dark">
        <div className={`h-full ${over ? 'bg-red-500' : 'bg-notion-accent'}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      </div>
    </div>
  );
}
