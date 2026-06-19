import { Archive, Plus, Trash2, X } from 'lucide-react';
import { useEntityStore } from '@/store/useEntityStore';
import {
  HORIZON_LABELS,
  type Horizon,
  type Priority,
  PRIORITY_LABELS,
  type TaskStatus,
} from '@/types/aura';
import { newId } from '@/lib/id';
import { ProgressBar } from './ProgressBar';

interface KPI {
  id: string;
  label: string;
  target: string;
  current: string;
}

interface EntityPanelProps {
  entityId: string;
  onClose: () => void;
}

const TASK_STATUS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'À faire' },
  { id: 'doing', label: 'En cours' },
  { id: 'done', label: 'Terminé' },
];

export function EntityPanel({ entityId, onClose }: EntityPanelProps) {
  const entity = useEntityStore((s) => s.entities[entityId]);
  const updateEntity = useEntityStore((s) => s.updateEntity);
  const updateProps = useEntityStore((s) => s.updateProps);
  const deleteEntity = useEntityStore((s) => s.deleteEntity);
  const parentOf = useEntityStore((s) => s.parentOf);
  const childrenOf = useEntityStore((s) => s.childrenOf);
  const progressOf = useEntityStore((s) => s.progressOf);

  if (!entity) return null;

  const p = entity.props;
  const isObjective = entity.type === 'objective' || entity.type === 'vision';
  const kpis = (p.kpis as KPI[]) ?? [];
  const parent = parentOf(entityId);
  const children = childrenOf(entityId);

  const setKpis = (next: KPI[]) => updateProps(entityId, { kpis: next });

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col overflow-y-auto border-l border-notion-border bg-notion-sidebar/40 dark:border-notion-border-dark dark:bg-notion-sidebar-dark/40">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-notion-muted">Détails</span>
        <button type="button" onClick={onClose} className="rounded p-1 hover:bg-notion-hover dark:hover:bg-notion-hover-dark">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4 px-4 pb-8">
        <input
          value={entity.title}
          onChange={(e) => updateEntity(entityId, { title: e.target.value })}
          placeholder="Sans titre"
          className="w-full bg-transparent text-lg font-semibold outline-none"
        />

        <div>
          <Label>Avancement (roll-up)</Label>
          <ProgressBar value={progressOf(entityId)} />
        </div>

        {isObjective && (
          <Field label="Horizon">
            <select
              value={(p.horizon as Horizon) ?? 'annual'}
              onChange={(e) => updateProps(entityId, { horizon: e.target.value })}
              className={selectCls}
            >
              {(Object.keys(HORIZON_LABELS) as Horizon[]).map((h) => (
                <option key={h} value={h}>{HORIZON_LABELS[h]}</option>
              ))}
            </select>
          </Field>
        )}

        {entity.type === 'task' && (
          <Field label="Statut">
            <select
              value={(p.status as TaskStatus) ?? 'todo'}
              onChange={(e) => updateProps(entityId, { status: e.target.value })}
              className={selectCls}
            >
              {TASK_STATUS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Priorité">
          <select
            value={(p.priority as Priority) ?? 'medium'}
            onChange={(e) => updateProps(entityId, { priority: e.target.value })}
            className={selectCls}
          >
            {(Object.keys(PRIORITY_LABELS) as Priority[]).map((pr) => (
              <option key={pr} value={pr}>{PRIORITY_LABELS[pr]}</option>
            ))}
          </select>
        </Field>

        <Field label="Échéance">
          <input
            type="date"
            value={(p.due as string) ?? ''}
            onChange={(e) => updateProps(entityId, { due: e.target.value })}
            className={selectCls}
          />
        </Field>

        {/* Manual progress only when the entity has no children to roll up. */}
        {children.length === 0 && entity.type !== 'task' && (
          <Field label="Avancement manuel">
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(((p.progress as number) ?? 0) * 100)}
              onChange={(e) => updateProps(entityId, { progress: Number(e.target.value) / 100 })}
              className="w-full"
            />
          </Field>
        )}

        {isObjective && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label>Indicateurs de succès (KPI)</Label>
              <button
                type="button"
                onClick={() => setKpis([...kpis, { id: newId(), label: '', target: '', current: '' }])}
                className="rounded p-0.5 text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1.5">
              {kpis.map((k) => (
                <div key={k.id} className="flex items-center gap-1">
                  <input
                    value={k.label}
                    onChange={(e) => setKpis(kpis.map((x) => (x.id === k.id ? { ...x, label: e.target.value } : x)))}
                    placeholder="Métrique"
                    className="min-w-0 flex-1 rounded border border-notion-border bg-transparent px-1.5 py-1 text-xs dark:border-notion-border-dark"
                  />
                  <input
                    value={k.current}
                    onChange={(e) => setKpis(kpis.map((x) => (x.id === k.id ? { ...x, current: e.target.value } : x)))}
                    placeholder="0"
                    className="w-12 rounded border border-notion-border bg-transparent px-1.5 py-1 text-xs dark:border-notion-border-dark"
                  />
                  <span className="text-xs text-notion-muted">/</span>
                  <input
                    value={k.target}
                    onChange={(e) => setKpis(kpis.map((x) => (x.id === k.id ? { ...x, target: e.target.value } : x)))}
                    placeholder="cible"
                    className="w-12 rounded border border-notion-border bg-transparent px-1.5 py-1 text-xs dark:border-notion-border-dark"
                  />
                  <button type="button" onClick={() => setKpis(kpis.filter((x) => x.id !== k.id))} className="text-notion-muted hover:text-red-600">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <Field label="Notes">
          <textarea
            value={(p.notes as string) ?? ''}
            onChange={(e) => updateProps(entityId, { notes: e.target.value })}
            rows={4}
            placeholder="Contexte, commentaires libres…"
            className="w-full resize-y rounded border border-notion-border bg-transparent px-2 py-1.5 text-sm outline-none dark:border-notion-border-dark"
          />
        </Field>

        {(parent || children.length > 0) && (
          <div className="rounded-md border border-notion-border p-2 text-xs dark:border-notion-border-dark">
            {parent && (
              <div className="mb-1">
                <span className="text-notion-muted">Rattaché à : </span>
                {parent.title || 'Sans titre'}
              </div>
            )}
            {children.length > 0 && (
              <div>
                <span className="text-notion-muted">Enfants : </span>
                {children.length}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => updateEntity(entityId, { archived: !entity.archived })}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
          >
            <Archive size={13} /> {entity.archived ? 'Désarchiver' : 'Archiver'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Supprimer définitivement cette entité ?')) {
                void deleteEntity(entityId);
                onClose();
              }
            }}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
          >
            <Trash2 size={13} /> Supprimer
          </button>
        </div>
      </div>
    </aside>
  );
}

const selectCls =
  'w-full rounded border border-notion-border bg-transparent px-2 py-1 text-sm outline-none dark:border-notion-border-dark';

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-xs font-medium text-notion-muted">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
