import { useEffect } from 'react';
import { Table2 } from 'lucide-react';
import { useDatabaseStore } from '@/store/useDatabaseStore';
import { TableView } from './TableView';

interface DatabaseViewProps {
  pageId: string;
}

export function DatabaseView({ pageId }: DatabaseViewProps) {
  const database = useDatabaseStore((s) => s.databases[pageId]);
  const rows = useDatabaseStore((s) => s.rowsByDb[pageId]);
  const loadRows = useDatabaseStore((s) => s.loadRows);
  const createDatabase = useDatabaseStore((s) => s.createDatabase);

  useEffect(() => {
    if (!database) {
      // Page is typed 'database' but has no schema yet (e.g. just converted).
      void createDatabase(pageId);
    } else {
      void loadRows(pageId);
    }
  }, [pageId, database, loadRows, createDatabase]);

  if (!database || !rows) {
    return <div className="px-6 py-4 text-sm text-notion-muted">Chargement de la base…</div>;
  }

  const activeView = database.views[0];

  return (
    <div className="px-4 pb-20">
      {/* View tabs (only Table in S4; kanban/gallery/calendar arrive in S5). */}
      <div className="mb-2 flex items-center gap-2 border-b border-notion-border px-2 dark:border-notion-border-dark">
        <span className="flex items-center gap-1.5 border-b-2 border-notion-text px-1 py-2 text-sm font-medium dark:border-notion-text-dark">
          <Table2 size={15} /> {activeView?.name ?? 'Table'}
        </span>
      </div>

      <div className="rounded-md border border-notion-border dark:border-notion-border-dark">
        <TableView database={database} rows={rows} />
      </div>
    </div>
  );
}
