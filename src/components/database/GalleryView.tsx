import { Plus } from 'lucide-react';
import type { Database, Row } from '@/types';
import { useDatabaseStore } from '@/store/useDatabaseStore';
import { ValueDisplay } from './ValueDisplay';

interface GalleryViewProps {
  database: Database;
  rows: Row[];
}

export function GalleryView({ database, rows }: GalleryViewProps) {
  const updateRowValue = useDatabaseStore((s) => s.updateRowValue);
  const addRow = useDatabaseStore((s) => s.addRow);
  const titleProp = database.titlePropId;
  const visibleProps = database.properties.filter((p) => p.id !== titleProp);

  return (
    <div className="px-2 pb-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex flex-col rounded-lg border border-notion-border bg-white p-3 shadow-sm dark:border-notion-border-dark dark:bg-[#252525]"
          >
            <input
              value={(row.values[titleProp] as string) ?? ''}
              onChange={(e) => updateRowValue(row.id, database.id, titleProp, e.target.value)}
              placeholder="Sans titre"
              className="mb-2 w-full bg-transparent text-sm font-medium outline-none"
            />
            <div className="flex flex-col gap-1">
              {visibleProps.map((p) => (
                <ValueDisplay key={p.id} prop={p} value={row.values[p.id]} />
              ))}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => void addRow(database.id)}
          className="flex min-h-[80px] items-center justify-center gap-1 rounded-lg border border-dashed border-notion-border text-sm text-notion-muted hover:bg-notion-hover dark:border-notion-border-dark dark:hover:bg-notion-hover-dark"
        >
          <Plus size={15} /> Nouvelle carte
        </button>
      </div>
    </div>
  );
}
