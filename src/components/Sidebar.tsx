import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronsLeft,
  Download,
  FileDown,
  Github,
  HelpCircle,
  Lock,
  Plus,
  Search,
  Sparkles,
  Star,
  Table2,
  Trash2,
  Upload,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useDatabaseStore } from '@/store/useDatabaseStore';
import { useEntityStore } from '@/store/useEntityStore';
import { useUIStore } from '@/store/useUIStore';
import { PageTreeItem } from './PageTreeItem';
import { ModuleNav } from '@/components/aura/ModuleNav';
import { exportEncryptedJSON, exportJSON, exportMarkdownZip, importJSON } from '@/lib/backup';
import { decryptString, isEncryptedEnvelope } from '@/lib/crypto';
import { markdownToTiptap } from '@/lib/markdownImport';
import { db } from '@/db/db';
import { searchIndex } from '@/lib/searchIndex';

export function Sidebar() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const pages = useWorkspaceStore((s) => s.pages);
  const rootOrder = useWorkspaceStore((s) => s.rootOrder);
  const createPage = useWorkspaceStore((s) => s.createPage);
  const init = useWorkspaceStore((s) => s.init);
  const createDatabase = useDatabaseStore((s) => s.createDatabase);
  const initDatabases = useDatabaseStore((s) => s.init);
  const { setSidebarOpen, setSearchOpen, setHelpOpen, setTrashOpen, setCopilotOpen, setSyncOpen } = useUIStore();

  const favorites = Object.values(pages).filter((p) => p.favorite && !p.trashed);

  const newPage = async () => {
    const id = await createPage(null);
    navigate(`/page/${id}`);
  };

  const newDatabase = async () => {
    const id = await createPage(null, { type: 'database', icon: '🗃️', title: 'Base de données' });
    await createDatabase(id);
    navigate(`/page/${id}`);
  };

  const rebuildIndex = async () => {
    const allRows = await db.rows.toArray();
    searchIndex.buildAll(
      Object.values(useWorkspaceStore.getState().pages),
      useDatabaseStore.getState().databases,
      allRows,
    );
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith('.md')) {
        // Markdown → a new top-level page.
        const { title, doc } = markdownToTiptap(text);
        const fallback = file.name.replace(/\.md$/i, '');
        const id = await createPage(null, { title: title || fallback, content: doc });
        navigate(`/page/${id}`);
      } else {
        let payload = text;
        const parsed = JSON.parse(text);
        if (isEncryptedEnvelope(parsed)) {
          const pass = window.prompt('Sauvegarde chiffrée — entrez la passphrase :');
          if (!pass) return;
          payload = await decryptString(parsed, pass);
        }
        const count = await importJSON(payload);
        await init();
        await initDatabases();
        await useEntityStore.getState().init();
        await rebuildIndex();
        alert(`${count} page(s) importée(s).`);
      }
    } catch (err) {
      alert(`Échec de l'import : ${(err as Error).message}`);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-notion-border bg-notion-sidebar dark:border-notion-border-dark dark:bg-notion-sidebar-dark">
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="select-none px-1 text-sm font-semibold">DAOR</span>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="rounded p-1 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
          title="Masquer le menu"
        >
          <ChevronsLeft size={18} />
        </button>
      </div>

      <div className="px-2">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="mb-1 flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
        >
          <Search size={16} /> Rechercher
        </button>
        <button
          type="button"
          onClick={() => setCopilotOpen(true)}
          className="mb-1 flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm font-medium text-notion-accent hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
        >
          <Sparkles size={16} /> Copilote IA
        </button>
      </div>

      <ModuleNav />

      <div className="mx-2 mb-1 border-t border-notion-border dark:border-notion-border-dark" />

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {favorites.length > 0 && (
          <div className="mb-3">
            <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-notion-muted">
              Favoris
            </div>
            {favorites.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/page/${p.id}`)}
                className="flex w-full items-center gap-2 truncate rounded px-2 py-1 text-left text-sm hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
              >
                <Star size={14} className="fill-yellow-400 text-yellow-400" />
                <span className="truncate">{p.title || 'Sans titre'}</span>
              </button>
            ))}
          </div>
        )}

        <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-notion-muted">
          Pages
        </div>
        {rootOrder.length === 0 && (
          <div className="px-2 py-2 text-sm text-notion-muted">Aucune page</div>
        )}
        {rootOrder.map((id) => (
          <PageTreeItem key={id} pageId={id} depth={0} />
        ))}

        <button
          type="button"
          onClick={newPage}
          className="mt-1 flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
        >
          <Plus size={16} /> Nouvelle page
        </button>
        <button
          type="button"
          onClick={newDatabase}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
        >
          <Table2 size={16} /> Nouvelle base
        </button>
      </div>

      <div className="border-t border-notion-border p-2 dark:border-notion-border-dark">
        <div className="mb-1 grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => setTrashOpen(true)}
            className="flex items-center justify-center gap-1 rounded px-1 py-1.5 text-xs text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
            title="Corbeille"
          >
            <Trash2 size={15} /> Corbeille
          </button>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex items-center justify-center gap-1 rounded px-1 py-1.5 text-xs text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
            title="Guide des fonctionnalités"
          >
            <HelpCircle size={15} /> Guide
          </button>
          <button
            type="button"
            onClick={() => setSyncOpen(true)}
            className="flex items-center justify-center gap-1 rounded px-1 py-1.5 text-xs text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
            title="Sauvegarde GitHub"
          >
            <Github size={15} /> Sync
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => void exportJSON()}
            className="flex flex-col items-center gap-1 rounded px-1 py-2 text-[11px] text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
            title="Exporter en JSON (sauvegarde complète)"
          >
            <Download size={16} /> JSON
          </button>
          <button
            type="button"
            onClick={() => {
              const pass = window.prompt('Passphrase pour chiffrer la sauvegarde :');
              if (pass) void exportEncryptedJSON(pass);
            }}
            className="flex flex-col items-center gap-1 rounded px-1 py-2 text-[11px] text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
            title="Exporter une sauvegarde chiffrée (passphrase)"
          >
            <Lock size={16} /> Chiffré
          </button>
          <button
            type="button"
            onClick={() => exportMarkdownZip(Object.values(pages), rootOrder)}
            className="flex flex-col items-center gap-1 rounded px-1 py-2 text-[11px] text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
            title="Exporter en Markdown (.zip prêt pour GitHub)"
          >
            <FileDown size={16} /> Markdown
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex flex-col items-center gap-1 rounded px-1 py-2 text-[11px] text-notion-muted hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
            title="Importer une sauvegarde JSON ou un fichier Markdown"
          >
            <Upload size={16} /> Import
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json,.md,text/markdown"
          className="hidden"
          onChange={handleImport}
        />
      </div>
    </aside>
  );
}
