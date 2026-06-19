import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { buildIndex } from '@/lib/search';

export function CommandPalette() {
  const navigate = useNavigate();
  const { searchOpen, setSearchOpen } = useUIStore();
  const pages = useWorkspaceStore((s) => s.pages);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  // Rebuild the search index whenever the palette opens.
  const index = useMemo(
    () => (searchOpen ? buildIndex(Object.values(pages)) : null),
    [searchOpen, pages],
  );

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      setSelected(0);
    }
  }, [searchOpen]);

  const results = useMemo(() => {
    if (!index) return [];
    if (!query.trim()) {
      return Object.values(pages)
        .filter((p) => !p.trashed)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 8)
        .map((p) => ({ id: p.id, title: p.title || 'Sans titre' }));
    }
    return index
      .search(query)
      .slice(0, 12)
      .map((r) => ({ id: r.id as string, title: (r as unknown as { title: string }).title }));
  }, [index, query, pages]);

  useEffect(() => setSelected(0), [results.length]);

  if (!searchOpen) return null;

  const go = (id: string) => {
    setSearchOpen(false);
    navigate(`/page/${id}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh]"
      onClick={() => setSearchOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-notion-border bg-white shadow-2xl dark:border-notion-border-dark dark:bg-[#252525]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-notion-border px-4 py-3 dark:border-notion-border-dark">
          <Search size={18} className="text-notion-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelected((s) => Math.min(s + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelected((s) => Math.max(s - 1, 0));
              } else if (e.key === 'Enter') {
                const r = results[selected];
                if (r) go(r.id);
              } else if (e.key === 'Escape') {
                setSearchOpen(false);
              }
            }}
            placeholder="Rechercher une page ou un contenu…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-notion-muted"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-notion-muted">Aucun résultat</div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onMouseEnter={() => setSelected(i)}
                onClick={() => go(r.id)}
                className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm ${
                  i === selected ? 'bg-notion-hover dark:bg-notion-hover-dark' : ''
                }`}
              >
                <FileText size={16} className="text-notion-muted" />
                <span className="truncate">{r.title}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
