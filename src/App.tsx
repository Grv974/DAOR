import { lazy, Suspense, useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { PanelLeft } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { PageView } from '@/components/PageView';
import { CommandPalette } from '@/components/CommandPalette';
import { HelpGuide } from '@/components/HelpGuide';
import { TrashModal } from '@/components/TrashModal';
import { QuickCapture } from '@/components/aura/QuickCapture';
import { Copilot } from '@/components/aura/Copilot';
import { GitSyncModal } from '@/components/aura/GitSyncModal';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useDatabaseStore } from '@/store/useDatabaseStore';
import { useEntityStore } from '@/store/useEntityStore';
import { useUIStore } from '@/store/useUIStore';
import { useParams } from 'react-router-dom';
import { db } from '@/db/db';
import { searchIndex } from '@/lib/searchIndex';

// AURA modules — lazy-loaded (code-splitting per the spec's perf targets).
const DashboardModule = lazy(() => import('@/modules/DashboardModule').then((m) => ({ default: m.DashboardModule })));
const ObjectivesModule = lazy(() => import('@/modules/ObjectivesModule').then((m) => ({ default: m.ObjectivesModule })));
const StrategyModule = lazy(() => import('@/modules/StrategyModule').then((m) => ({ default: m.StrategyModule })));
const CrmModule = lazy(() => import('@/modules/CrmModule').then((m) => ({ default: m.CrmModule })));
const OpportunitiesModule = lazy(() =>
  import('@/modules/OpportunitiesModule').then((m) => ({ default: m.OpportunitiesModule })),
);
const JournalModule = lazy(() => import('@/modules/JournalModule').then((m) => ({ default: m.JournalModule })));
const GraphModule = lazy(() => import('@/modules/GraphModule').then((m) => ({ default: m.GraphModule })));
const ProjectsModule = lazy(() => import('@/modules/ProjectsModule').then((m) => ({ default: m.ProjectsModule })));

function ModuleFallback() {
  return <div className="flex h-full items-center justify-center text-sm text-notion-muted">Chargement…</div>;
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
  const initEntities = useEntityStore((s) => s.init);
  const loaded = useWorkspaceStore((s) => s.loaded);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const setCaptureOpen = useUIStore((s) => s.setCaptureOpen);
  const navigate = useNavigate();
  const gPrefix = useRef(0);

  useEffect(() => {
    void (async () => {
      await Promise.all([init(), initDatabases(), initEntities()]);
      // Build the search index once data is loaded; it stays in sync
      // incrementally afterwards via store mutations.
      const allRows = await db.rows.toArray();
      searchIndex.buildAll(
        Object.values(useWorkspaceStore.getState().pages),
        useDatabaseStore.getState().databases,
        allRows,
      );
    })();
  }, [init, initDatabases, initEntities]);

  // Global keyboard shortcuts (§3.4).
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    };
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'k') { e.preventDefault(); setSearchOpen(true); return; }
      if (mod && key === 'n') { e.preventDefault(); setCaptureOpen(true); return; }
      if (mod && key === 'j') { e.preventDefault(); navigate('/m/journal'); return; }

      if (isTyping(e.target)) return;

      if (e.key === '[') { setSidebarOpen(false); return; }
      if (e.key === ']') { setSidebarOpen(true); return; }

      // "g" then a destination key (g g → graphe).
      if (Date.now() - gPrefix.current < 700) {
        const dest: Record<string, string> = { o: '/m/objectives', p: '/m/projects', c: '/m/crm', d: '/m/dashboard', j: '/m/journal', g: '/m/graph' };
        if (dest[key]) { navigate(dest[key]); gPrefix.current = 0; return; }
      }
      if (key === 'g') { gPrefix.current = Date.now(); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setSearchOpen, setCaptureOpen, setSidebarOpen, navigate]);

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
        <Suspense fallback={<ModuleFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/m/dashboard" replace />} />
            <Route path="/m/dashboard" element={<DashboardModule />} />
            <Route path="/m/objectives" element={<ObjectivesModule />} />
            <Route path="/m/strategy" element={<StrategyModule />} />
            <Route path="/m/projects" element={<ProjectsModule />} />
            <Route path="/m/crm" element={<CrmModule />} />
            <Route path="/m/opportunities" element={<OpportunitiesModule />} />
            <Route path="/m/journal" element={<JournalModule />} />
            <Route path="/m/graph" element={<GraphModule />} />
            <Route path="/page/:id" element={<PageRoute />} />
            <Route path="*" element={<Navigate to="/m/dashboard" replace />} />
          </Routes>
        </Suspense>
      </div>

      <CommandPalette />
      <HelpGuide />
      <TrashModal />
      <QuickCapture />
      <Copilot />
      <GitSyncModal />
    </div>
  );
}
