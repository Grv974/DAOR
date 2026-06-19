import { type ReactNode, useState } from 'react';
import {
  ArrowDownUp,
  Filter as FilterIcon,
  Group,
  LayoutTemplate,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { Database, DatabaseView, Filter, FilterOp, Sort } from '@/types';
import { useDatabaseStore } from '@/store/useDatabaseStore';
import { OPS_BY_TYPE } from '@/lib/query';
import { newId } from '@/lib/id';
import { Cell } from './Cell';

interface ToolbarProps {
  database: Database;
  view: DatabaseView;
}

type Panel = 'filter' | 'sort' | 'group' | 'template' | null;

export function ViewToolbar({ database, view }: ToolbarProps) {
  const [panel, setPanel] = useState<Panel>(null);
  const updateView = useDatabaseStore((s) => s.updateView);

  const propById = (id: string) => database.properties.find((p) => p.id === id);

  // ---- Filters ----
  const addFilter = () => {
    const prop = database.properties[0];
    const op = OPS_BY_TYPE[prop.type][0].op;
    const filter: Filter = { id: newId(), propId: prop.id, op, value: '' };
    updateView(database.id, view.id, { filters: [...view.filters, filter] });
  };
  const updateFilter = (id: string, patch: Partial<Filter>) =>
    updateView(database.id, view.id, {
      filters: view.filters.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  const removeFilter = (id: string) =>
    updateView(database.id, view.id, { filters: view.filters.filter((f) => f.id !== id) });

  // ---- Sorts ----
  const addSort = () => {
    const sort: Sort = { propId: database.properties[0].id, direction: 'asc' };
    updateView(database.id, view.id, { sorts: [...view.sorts, sort] });
  };
  const updateSort = (i: number, patch: Partial<Sort>) =>
    updateView(database.id, view.id, {
      sorts: view.sorts.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    });
  const removeSort = (i: number) =>
    updateView(database.id, view.id, { sorts: view.sorts.filter((_, idx) => idx !== i) });

  const btn = (key: Panel, icon: ReactNode, label: string, badge?: number) => (
    <button
      type="button"
      onClick={() => setPanel((p) => (p === key ? null : key))}
      className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
        panel === key ? 'bg-notion-hover dark:bg-notion-hover-dark' : 'text-notion-muted'
      } hover:bg-notion-hover dark:hover:bg-notion-hover-dark`}
    >
      {icon} {label}
      {badge ? <span className="rounded-full bg-notion-accent px-1 text-[10px] text-white">{badge}</span> : null}
    </button>
  );

  const selectProps = database.properties.filter((p) => p.type === 'select');
  const dateProps = database.properties.filter((p) => p.type === 'date');

  return (
    <div className="relative">
      <div className="flex items-center gap-1 px-2 py-1">
        {btn('filter', <FilterIcon size={13} />, 'Filtrer', view.filters.length)}
        {btn('sort', <ArrowDownUp size={13} />, 'Trier', view.sorts.length)}
        {view.type === 'kanban' && btn('group', <Group size={13} />, 'Grouper')}
        {view.type === 'calendar' && btn('group', <Group size={13} />, 'Date')}
        {btn('template', <LayoutTemplate size={13} />, 'Modèles', database.templates.length)}
      </div>

      {panel && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setPanel(null)} />
          <div className="absolute left-2 top-full z-30 mt-1 w-80 rounded-md border border-notion-border bg-white p-3 shadow-lg dark:border-notion-border-dark dark:bg-[#252525]">
            {panel === 'filter' && (
              <div className="space-y-2">
                {view.filters.length === 0 && (
                  <p className="text-xs text-notion-muted">Aucun filtre.</p>
                )}
                {view.filters.map((f) => {
                  const prop = propById(f.propId);
                  const ops = prop ? OPS_BY_TYPE[prop.type] : [];
                  const needsValue = !['isEmpty', 'isNotEmpty', 'checked', 'unchecked'].includes(f.op);
                  return (
                    <div key={f.id} className="flex items-center gap-1">
                      <select
                        value={f.propId}
                        onChange={(e) => {
                          const np = propById(e.target.value)!;
                          updateFilter(f.id, { propId: np.id, op: OPS_BY_TYPE[np.type][0].op });
                        }}
                        className="min-w-0 flex-1 rounded border border-notion-border bg-transparent px-1 py-0.5 text-xs dark:border-notion-border-dark"
                      >
                        {database.properties.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <select
                        value={f.op}
                        onChange={(e) => updateFilter(f.id, { op: e.target.value as FilterOp })}
                        className="rounded border border-notion-border bg-transparent px-1 py-0.5 text-xs dark:border-notion-border-dark"
                      >
                        {ops.map((o) => (
                          <option key={o.op} value={o.op}>{o.label}</option>
                        ))}
                      </select>
                      {needsValue && (
                        <input
                          value={(f.value as string) ?? ''}
                          onChange={(e) => updateFilter(f.id, { value: e.target.value })}
                          className="w-16 rounded border border-notion-border bg-transparent px-1 py-0.5 text-xs dark:border-notion-border-dark"
                        />
                      )}
                      <button type="button" onClick={() => removeFilter(f.id)} className="text-notion-muted hover:text-red-600">
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
                <button type="button" onClick={addFilter} className="flex items-center gap-1 text-xs text-notion-accent">
                  <Plus size={13} /> Ajouter un filtre
                </button>
              </div>
            )}

            {panel === 'sort' && (
              <div className="space-y-2">
                {view.sorts.length === 0 && <p className="text-xs text-notion-muted">Aucun tri.</p>}
                {view.sorts.map((s, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <select
                      value={s.propId}
                      onChange={(e) => updateSort(i, { propId: e.target.value })}
                      className="min-w-0 flex-1 rounded border border-notion-border bg-transparent px-1 py-0.5 text-xs dark:border-notion-border-dark"
                    >
                      {database.properties.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <select
                      value={s.direction}
                      onChange={(e) => updateSort(i, { direction: e.target.value as 'asc' | 'desc' })}
                      className="rounded border border-notion-border bg-transparent px-1 py-0.5 text-xs dark:border-notion-border-dark"
                    >
                      <option value="asc">Croissant</option>
                      <option value="desc">Décroissant</option>
                    </select>
                    <button type="button" onClick={() => removeSort(i)} className="text-notion-muted hover:text-red-600">
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addSort} className="flex items-center gap-1 text-xs text-notion-accent">
                  <Plus size={13} /> Ajouter un tri
                </button>
              </div>
            )}

            {panel === 'group' && view.type !== 'calendar' && (
              <div className="space-y-2">
                <p className="text-xs text-notion-muted">Grouper par une propriété de type « Sélection ».</p>
                <select
                  value={view.groupByPropId ?? ''}
                  onChange={(e) => updateView(database.id, view.id, { groupByPropId: e.target.value || null })}
                  className="w-full rounded border border-notion-border bg-transparent px-1 py-1 text-xs dark:border-notion-border-dark"
                >
                  <option value="">Aucun</option>
                  {selectProps.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {panel === 'group' && view.type === 'calendar' && (
              <div className="space-y-2">
                <p className="text-xs text-notion-muted">Propriété date affichée dans le calendrier.</p>
                <select
                  value={view.datePropId ?? ''}
                  onChange={(e) => updateView(database.id, view.id, { datePropId: e.target.value || null })}
                  className="w-full rounded border border-notion-border bg-transparent px-1 py-1 text-xs dark:border-notion-border-dark"
                >
                  <option value="">Aucune</option>
                  {dateProps.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {panel === 'template' && <TemplatePanel database={database} />}
          </div>
        </>
      )}
    </div>
  );
}

function TemplatePanel({ database }: { database: Database }) {
  const addTemplate = useDatabaseStore((s) => s.addTemplate);
  const updateTemplate = useDatabaseStore((s) => s.updateTemplate);
  const deleteTemplate = useDatabaseStore((s) => s.deleteTemplate);
  const addRow = useDatabaseStore((s) => s.addRow);
  const [editing, setEditing] = useState<string | null>(null);

  const editable = database.properties.filter((p) => p.id !== database.titlePropId);

  return (
    <div className="space-y-2">
      {database.templates.length === 0 && (
        <p className="text-xs text-notion-muted">Aucun modèle. Un modèle pré-remplit les propriétés d’une nouvelle ligne.</p>
      )}
      {database.templates.map((t) => (
        <div key={t.id} className="rounded border border-notion-border p-2 dark:border-notion-border-dark">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t.name}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void addRow(database.id, t.id)}
                className="rounded px-1.5 py-0.5 text-xs text-notion-accent hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
              >
                Utiliser
              </button>
              <button
                type="button"
                onClick={() => setEditing((e) => (e === t.id ? null : t.id))}
                className="rounded px-1.5 py-0.5 text-xs text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
              >
                Éditer
              </button>
              <button type="button" onClick={() => deleteTemplate(database.id, t.id)} className="text-notion-muted hover:text-red-600">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          {editing === t.id && (
            <div className="mt-2 space-y-1 border-t border-notion-border pt-2 dark:border-notion-border-dark">
              {editable.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 truncate text-xs text-notion-muted">{p.name}</span>
                  <div className="min-w-0 flex-1 rounded border border-notion-border dark:border-notion-border-dark">
                    <Cell
                      dbId={database.id}
                      prop={p}
                      value={t.values[p.id]}
                      onChange={(v) => updateTemplate(database.id, t.id, { ...t.values, [p.id]: v })}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          const name = window.prompt('Nom du modèle :', 'Nouveau modèle');
          if (name) addTemplate(database.id, name.trim(), {});
        }}
        className="flex items-center gap-1 text-xs text-notion-accent"
      >
        <Plus size={13} /> Nouveau modèle
      </button>
    </div>
  );
}
