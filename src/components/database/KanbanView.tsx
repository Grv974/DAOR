import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Database, DatabaseView, Row } from '@/types';
import { useDatabaseStore } from '@/store/useDatabaseStore';
import { groupRows } from '@/lib/query';
import { ValueDisplay } from './ValueDisplay';

interface KanbanViewProps {
  database: Database;
  view: DatabaseView;
  rows: Row[];
}

export function KanbanView({ database, view, rows }: KanbanViewProps) {
  const updateRowValue = useDatabaseStore((s) => s.updateRowValue);
  const addRow = useDatabaseStore((s) => s.addRow);
  const [dragRow, setDragRow] = useState<string | null>(null);

  const groupProp = database.properties.find((p) => p.id === view.groupByPropId);

  if (!groupProp || groupProp.type !== 'select') {
    return (
      <div className="px-4 py-6 text-sm text-notion-muted">
        Sélectionnez une propriété de type « Sélection » dans <b>Grouper</b> pour afficher le kanban.
      </div>
    );
  }

  const groups = groupRows(rows, groupProp);
  const titleProp = database.titlePropId;
  const visibleProps = database.properties.filter(
    (p) => p.id !== titleProp && p.id !== groupProp.id,
  );

  const drop = async (key: string | null) => {
    if (!dragRow) return;
    updateRowValue(dragRow, database.id, groupProp.id, key);
    setDragRow(null);
  };

  const addCard = async (key: string | null) => {
    await addRow(database.id);
    // Read fresh state — the closure's rows are stale right after the insert.
    const created = (useDatabaseStore.getState().rowsByDb[database.id] ?? []).at(-1);
    if (created && key) updateRowValue(created.id, database.id, groupProp.id, key);
  };

  return (
    <div className="flex gap-3 overflow-x-auto px-2 pb-4">
      {groups.map((group) => (
        <div
          key={group.key ?? '__none__'}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => void drop(group.key)}
          className="flex w-64 shrink-0 flex-col rounded-md bg-notion-sidebar p-2 dark:bg-notion-sidebar-dark"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-sm font-medium">{group.label}</span>
            <span className="text-xs text-notion-muted">{group.rows.length}</span>
          </div>

          <div className="flex flex-col gap-2">
            {group.rows.map((row) => (
              <div
                key={row.id}
                draggable
                onDragStart={() => setDragRow(row.id)}
                className="cursor-grab rounded-md border border-notion-border bg-white p-2 shadow-sm active:cursor-grabbing dark:border-notion-border-dark dark:bg-[#252525]"
              >
                <input
                  value={(row.values[titleProp] as string) ?? ''}
                  onChange={(e) => updateRowValue(row.id, database.id, titleProp, e.target.value)}
                  placeholder="Sans titre"
                  className="mb-1 w-full bg-transparent text-sm font-medium outline-none"
                />
                <div className="flex flex-col gap-1">
                  {visibleProps.map((p) => (
                    <ValueDisplay key={p.id} prop={p} value={row.values[p.id]} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void addCard(group.key)}
            className="mt-2 flex items-center gap-1 rounded px-1 py-1 text-xs text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
          >
            <Plus size={13} /> Ajouter
          </button>
        </div>
      ))}
    </div>
  );
}
