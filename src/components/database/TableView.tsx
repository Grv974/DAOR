import { Plus, Trash2 } from 'lucide-react';
import type { Database, Row } from '@/types';
import { useDatabaseStore } from '@/store/useDatabaseStore';
import { Cell } from './Cell';
import { AddPropertyMenu, PropertyHeader } from './PropertyHeader';

interface TableViewProps {
  database: Database;
  rows: Row[];
}

const TITLE_WIDTH = 240;
const COL_WIDTH = 180;

export function TableView({ database, rows }: TableViewProps) {
  const updateRowValue = useDatabaseStore((s) => s.updateRowValue);
  const deleteRow = useDatabaseStore((s) => s.deleteRow);
  const addRow = useDatabaseStore((s) => s.addRow);

  const gridCols =
    database.properties
      .map((p) => (p.id === database.titlePropId ? `${TITLE_WIDTH}px` : `${COL_WIDTH}px`))
      .join(' ') + ' 40px';

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Header */}
        <div
          className="grid border-b border-notion-border dark:border-notion-border-dark"
          style={{ gridTemplateColumns: gridCols }}
        >
          {database.properties.map((prop) => (
            <div
              key={prop.id}
              className="border-r border-notion-border dark:border-notion-border-dark"
            >
              <PropertyHeader dbId={database.id} prop={prop} isTitle={prop.id === database.titlePropId} />
            </div>
          ))}
          <div className="flex items-center justify-center">
            <AddPropertyMenu dbId={database.id} />
          </div>
        </div>

        {/* Rows */}
        {rows.map((row) => (
          <div
            key={row.id}
            className="group grid border-b border-notion-border hover:bg-notion-hover/40 dark:border-notion-border-dark dark:hover:bg-notion-hover-dark/40"
            style={{ gridTemplateColumns: gridCols }}
          >
            {database.properties.map((prop) => (
              <div
                key={prop.id}
                className="min-h-[34px] border-r border-notion-border dark:border-notion-border-dark"
              >
                <Cell
                  dbId={database.id}
                  prop={prop}
                  value={row.values[prop.id]}
                  onChange={(v) => updateRowValue(row.id, database.id, prop.id, v)}
                />
              </div>
            ))}
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => void deleteRow(row.id, database.id)}
                className="rounded p-1 text-notion-muted opacity-0 hover:text-red-600 group-hover:opacity-100"
                title="Supprimer la ligne"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {/* Footer */}
        <button
          type="button"
          onClick={() => void addRow(database.id)}
          className="flex w-full items-center gap-2 px-2 py-2 text-sm text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
        >
          <Plus size={15} /> Nouvelle ligne
        </button>
        <div className="px-2 py-1 text-xs text-notion-muted">{rows.length} ligne(s)</div>
      </div>
    </div>
  );
}
