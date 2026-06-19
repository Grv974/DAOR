import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { PanelLeft } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { PageView } from '@/components/PageView';
import { CommandPalette } from '@/components/CommandPalette';
import { HelpGuide } from '@/components/HelpGuide';
import { TrashModal } from '@/components/TrashModal';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useDatabaseStore } from '@/store/useDatabaseStore';
import { useUIStore } from '@/store/useUIStore';
import { useParams } from 'react-router-dom';
import { db } from '@/db/db';
import { searchIndex } from '@/lib/searchIndex';

function Home() {
  const navigate = useNavigate();
  const rootOrder = useWorkspaceStore((s) => s.rootOrder);
  const createPage = useWorkspaceStore((s) => s.createPage);

  // If pages exist, open the first one; otherwise show a welcome screen.
  useEffect(() => {
    if (rootOrder.length > 0) navigate(`/page/${rootOrder[0]}`, { replace: true });
  }, [rootOrder, navigate]);

  if (rootOrder.length > 0) return null;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold">Bienvenue dans DAOR</h1>
      <p className="max-w-sm text-notion-muted">
        Un espace de travail façon Notion, 100 % local et hors ligne. Vos données restent dans ce
        navigateur.
      </p>
      <button
        type="button"
        onClick={async () => navigate(`/page/${await createPage(null)}`)}
        className="rounded-md bg-notion-accent px-4 py-2 text-sm font-medium text-white"
      >
        Créer ma première page
      </button>
    </div>
  );
}

function PageRoute() {
  const { id } = useParams();
  return (
    <>
      <Topbar pageId={id} />
      <main className="min-h-0 flex-1 overflow-hidden">
        <PageView />
      </main>
    </>
  );
}

export default function App() {
  const init = useWorkspaceStore((s) => s.init);
  const initDatabases = useDatabaseStore((s) => s.init);
  const loaded = useWorkspaceStore((s) => s.loaded);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);

  useEffect(() => {
    void (async () => {
      await Promise.all([init(), initDatabases()]);
      // Build the search index once data is loaded; it stays in sync
      // incrementally afterwards via store mutations.
      const allRows = await db.rows.toArray();
      searchIndex.buildAll(
        Object.values(useWorkspaceStore.getState().pages),
        useDatabaseStore.getState().databases,
        allRows,
      );
    })();
  }, [init, initDatabases]);

  // Global Ctrl/Cmd+K to open search.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setSearchOpen]);

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center text-notion-muted">Chargement…</div>
    );
  }

  return (
    <div className="flex h-full bg-notion-bg text-notion-text dark:bg-notion-bg-dark dark:text-notion-text-dark">
      {sidebarOpen && <Sidebar />}

      {/* Always-available control to bring the sidebar back when collapsed. */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="fixed left-2 top-2 z-40 rounded-md border border-notion-border bg-white/90 p-1.5 shadow-sm backdrop-blur hover:bg-notion-hover dark:border-notion-border-dark dark:bg-[#2a2a2a]/90 dark:hover:bg-notion-hover-dark"
          title="Afficher le menu latéral"
        >
          <PanelLeft size={18} />
        </button>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/page/:id" element={<PageRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <CommandPalette />
      <HelpGuide />
      <TrashModal />
    </div>
  );
}
