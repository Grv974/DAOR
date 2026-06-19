import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  GalleryHorizontalEnd,
  Plus,
  Table2,
  Trello,
  X,
} from 'lucide-react';
import type { ViewType } from '@/types';
import { useDatabaseStore } from '@/store/useDatabaseStore';
import { applyFiltersAndSorts } from '@/lib/query';
import { TableView } from './TableView';
import { KanbanView } from './KanbanView';
import { GalleryView } from './GalleryView';
import { CalendarView } from './CalendarView';
import { ViewToolbar } from './ViewToolbar';

const VIEW_ICON: Record<ViewType, typeof Table2> = {
  table: Table2,
  kanban: Trello,
  gallery: GalleryHorizontalEnd,
  calendar: CalendarDays,
};

const VIEW_TYPES: { type: ViewType; label: string }[] = [
  { type: 'table', label: 'Table' },
  { type: 'kanban', label: 'Kanban' },
  { type: 'gallery', label: 'Galerie' },
  { type: 'calendar', label: 'Calendrier' },
];

export function DatabaseView({ pageId }: { pageId: string }) {
  const database = useDatabaseStore((s) => s.databases[pageId]);
  const rows = useDatabaseStore((s) => s.rowsByDb[pageId]);
  const loadRows = useDatabaseStore((s) => s.loadRows);
  const createDatabase = useDatabaseStore((s) => s.createDatabase);
  const addView = useDatabaseStore((s) => s.addView);
  const deleteView = useDatabaseStore((s) => s.deleteView);

  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  useEffect(() => {
    if (!database) void createDatabase(pageId);
    else void loadRows(pageId);
  }, [pageId, database, loadRows, createDatabase]);

  const activeView = useMemo(() => {
    if (!database) return undefined;
    return database.views.find((v) => v.id === activeViewId) ?? database.views[0];
  }, [database, activeViewId]);

  const processedRows = useMemo(() => {
    if (!database || !rows || !activeView) return [];
    return applyFiltersAndSorts(rows, database, activeView);
  }, [database, rows, activeView]);

  if (!database || !rows || !activeView) {
    return <div className="px-6 py-4 text-sm text-notion-muted">Chargement de la base…</div>;
  }

  return (
    <div className="px-4 pb-20">
      {/* View tabs */}
      <div className="mb-1 flex items-center gap-1 border-b border-notion-border px-2 dark:border-notion-border-dark">
        {database.views.map((v) => {
          const Icon = VIEW_ICON[v.type];
          const active = v.id === activeView.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setActiveViewId(v.id)}
              className={`group flex items-center gap-1.5 border-b-2 px-2 py-2 text-sm ${
                active
                  ? 'border-notion-text font-medium dark:border-notion-text-dark'
                  : 'border-transparent text-notion-muted hover:text-notion-text dark:hover:text-notion-text-dark'
              }`}
            >
              <Icon size={14} /> {v.name}
              {active && database.views.length > 1 && (
                <X
                  size={12}
                  className="opacity-0 hover:text-red-600 group-hover:opacity-60"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteView(database.id, v.id);
                    setActiveViewId(null);
                  }}
                />
              )}
            </button>
          );
        })}

        <div className="relative">
          <button
            type="button"
            onClick={() => setAddMenuOpen((o) => !o)}
            className="flex items-center gap-1 px-2 py-2 text-sm text-notion-muted hover:text-notion-text dark:hover:text-notion-text-dark"
          >
            <Plus size={14} />
          </button>
          {addMenuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setAddMenuOpen(false)} />
              <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-md border border-notion-border bg-white p-1 shadow-lg dark:border-notion-border-dark dark:bg-[#252525]">
                {VIEW_TYPES.map(({ type, label }) => {
                  const Icon = VIEW_ICON[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        const id = addView(database.id, type);
                        if (id) setActiveViewId(id);
                        setAddMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
                    >
                      <Icon size={14} className="text-notion-muted" /> {label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <ViewToolbar database={database} view={activeView} />

      <div className="mt-1">
        {activeView.type === 'table' && (
          <div className="rounded-md border border-notion-border dark:border-notion-border-dark">
            <TableView database={database} rows={processedRows} />
          </div>
        )}
        {activeView.type === 'kanban' && (
          <KanbanView database={database} view={activeView} rows={processedRows} />
        )}
        {activeView.type === 'gallery' && <GalleryView database={database} rows={processedRows} />}
        {activeView.type === 'calendar' && (
          <CalendarView database={database} view={activeView} rows={processedRows} />
        )}
      </div>
    </div>
  );
}
