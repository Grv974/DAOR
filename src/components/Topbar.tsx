import { Menu, Moon, Search, Sun } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

interface TopbarProps {
  pageId?: string;
}

export function Topbar({ pageId }: TopbarProps) {
  const { theme, toggleTheme, sidebarOpen, setSidebarOpen, setSearchOpen } = useUIStore();
  const pages = useWorkspaceStore((s) => s.pages);

  // Build a breadcrumb trail from the current page up to the root.
  const trail: { id: string; title: string }[] = [];
  let cursor = pageId ? pages[pageId] : undefined;
  while (cursor) {
    trail.unshift({ id: cursor.id, title: cursor.title || 'Sans titre' });
    cursor = cursor.parentId ? pages[cursor.parentId] : undefined;
  }

  return (
    <header className="flex h-11 items-center gap-2 border-b border-notion-border px-3 dark:border-notion-border-dark">
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="rounded p-1 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
          title="Afficher le menu"
        >
          <Menu size={18} />
        </button>
      )}
      <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm text-notion-muted">
        {trail.map((item, i) => (
          <span key={item.id} className="flex items-center gap-1 truncate">
            {i > 0 && <span className="opacity-50">/</span>}
            <span className="truncate">{item.title}</span>
          </span>
        ))}
      </nav>
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="rounded p-1.5 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
        title="Rechercher (Ctrl/Cmd+K)"
      >
        <Search size={18} />
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        className="rounded p-1.5 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
        title="Basculer le thème"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
}
