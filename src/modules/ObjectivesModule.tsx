import { useState } from 'react';
import {
  AlertTriangle,
  ChevronRight,
  CircleDot,
  FolderKanban,
  Plus,
  Sparkles,
  Target,
  CheckSquare,
} from 'lucide-react';
import { useEntityStore } from '@/store/useEntityStore';
import { HORIZON_LABELS, type Entity, type EntityType, type Horizon } from '@/types/aura';
import { ProgressBar } from '@/components/aura/ProgressBar';
import { EntityPanel } from '@/components/aura/EntityPanel';

const TYPE_ICON = {
  vision: Sparkles,
  objective: Target,
  project: FolderKanban,
  task: CheckSquare,
} as const;

export function ObjectivesModule() {
  const entities = useEntityStore((s) => s.entities);
  const relations = useEntityStore((s) => s.relations);
  const createEntity = useEntityStore((s) => s.createEntity);
  const setParent = useEntityStore((s) => s.setParent);
  const orphans = useEntityStore((s) => s.orphans);
  const [selected, setSelected] = useState<string | null>(null);
  const [showOrphans, setShowOrphans] = useState(false);

  const cascadeTypes: EntityType[] = ['vision', 'objective', 'project', 'task'];
  const hasParent = new Set(relations.filter((r) => r.type === 'parent').map((r) => r.source));
  const roots = Object.values(entities)
    .filter((e) => cascadeTypes.includes(e.type) && !e.archived && !hasParent.has(e.id))
    .sort((a, b) => a.createdAt - b.createdAt);

  const orphanList = orphans();

  const createRoot = async (type: EntityType) => {
    const id = await createEntity(type, {
      title: '',
      props: type === 'objective' || type === 'vision' ? { horizon: type === 'vision' ? 'vision' : 'annual', priority: 'high' } : { priority: 'medium' },
    });
    setSelected(id);
  };

  const addChild = async (parent: Entity, type: EntityType) => {
    const id = await createEntity(type, {
      props: type === 'objective' ? { horizon: 'quarter', priority: 'medium' } : { priority: 'medium', status: type === 'task' ? 'todo' : undefined },
    });
    setParent(id, parent.id);
    setSelected(id);
  };

  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="mb-4 flex items-center gap-3">
            <Target size={22} className="text-notion-accent" />
            <h1 className="text-2xl font-bold">Objectifs</h1>
            <div className="ml-auto flex gap-1">
              <button type="button" onClick={() => void createRoot('vision')} className={btnCls}>
                <Sparkles size={14} /> Vision
              </button>
              <button type="button" onClick={() => void createRoot('objective')} className={btnCls}>
                <Plus size={14} /> Objectif
              </button>
            </div>
          </div>

          {/* Orphan detector — "travail non aligné" */}
          {orphanList.length > 0 && (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-700 dark:bg-amber-950/40">
              <button
                type="button"
                onClick={() => setShowOrphans((v) => !v)}
                className="flex w-full items-center gap-2 text-left text-amber-800 dark:text-amber-300"
              >
                <AlertTriangle size={16} />
                {orphanList.length} élément(s) non aligné(s) sur un objectif
                <ChevronRight size={14} className={`ml-auto transition-transform ${showOrphans ? 'rotate-90' : ''}`} />
              </button>
              {showOrphans && (
                <div className="mt-2 space-y-1">
                  {orphanList.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setSelected(o.id)}
                      className="block w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-amber-100 dark:hover:bg-amber-900/40"
                    >
                      {o.type === 'project' ? '📁' : '☐'} {o.title || 'Sans titre'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {roots.length === 0 ? (
            <div className="rounded-lg border border-dashed border-notion-border p-8 text-center text-sm text-notion-muted dark:border-notion-border-dark">
              Définissez une <b>Vision</b> puis déclinez-la en objectifs annuels, trimestriels, projets et tâches.
              La cascade calcule automatiquement l'avancement de haut en bas.
            </div>
          ) : (
            <div className="space-y-0.5">
              {roots.map((r) => (
                <ObjNode key={r.id} id={r.id} depth={0} selected={selected} onSelect={setSelected} onAddChild={addChild} />
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && <EntityPanel entityId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

interface ObjNodeProps {
  id: string;
  depth: number;
  selected: string | null;
  onSelect: (id: string) => void;
  onAddChild: (parent: Entity, type: EntityType) => void;
}

function ObjNode({ id, depth, selected, onSelect, onAddChild }: ObjNodeProps) {
  const entity = useEntityStore((s) => s.entities[id]);
  const childrenOf = useEntityStore((s) => s.childrenOf);
  const progressOf = useEntityStore((s) => s.progressOf);
  const [expanded, setExpanded] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!entity || entity.archived) return null;
  const children = childrenOf(id).filter((c) => ['objective', 'project', 'task'].includes(c.type));
  const Icon = TYPE_ICON[entity.type as keyof typeof TYPE_ICON] ?? CircleDot;
  const horizon = entity.props.horizon as Horizon | undefined;

  return (
    <div>
      <div
        className={`group flex items-center gap-2 rounded px-2 py-1.5 ${
          selected === id ? 'bg-notion-hover dark:bg-notion-hover-dark' : 'hover:bg-notion-hover/60 dark:hover:bg-notion-hover-dark/60'
        }`}
        style={{ paddingLeft: depth * 18 + 8 }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`flex h-4 w-4 items-center justify-center ${children.length ? '' : 'invisible'}`}
        >
          <ChevronRight size={14} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
        <Icon size={15} className="shrink-0 text-notion-accent" />
        <button type="button" onClick={() => onSelect(id)} className="min-w-0 flex-1 truncate text-left text-sm">
          {entity.title || <span className="text-notion-muted">Sans titre</span>}
        </button>
        {horizon && (
          <span className="shrink-0 rounded bg-notion-hover px-1.5 py-0.5 text-[10px] text-notion-muted dark:bg-notion-hover-dark">
            {HORIZON_LABELS[horizon]}
          </span>
        )}
        <div className="w-28 shrink-0">
          <ProgressBar value={progressOf(id)} />
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded p-0.5 opacity-0 hover:bg-black/10 group-hover:opacity-100 dark:hover:bg-white/10"
            title="Ajouter un enfant"
          >
            <Plus size={14} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-6 z-30 w-36 rounded-md border border-notion-border bg-white p-1 shadow-lg dark:border-notion-border-dark dark:bg-[#252525]">
                {(['objective', 'project', 'task'] as EntityType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onAddChild(entity, t);
                      setMenuOpen(false);
                      setExpanded(true);
                    }}
                    className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
                  >
                    {t === 'objective' ? 'Sous-objectif' : t === 'project' ? 'Projet' : 'Tâche'}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {expanded &&
        children.map((c) => (
          <ObjNode key={c.id} id={c.id} depth={depth + 1} selected={selected} onSelect={onSelect} onAddChild={onAddChild} />
        ))}
    </div>
  );
}

const btnCls =
  'flex items-center gap-1 rounded-md border border-notion-border px-2 py-1 text-xs hover:bg-notion-hover dark:border-notion-border-dark dark:hover:bg-notion-hover-dark';
