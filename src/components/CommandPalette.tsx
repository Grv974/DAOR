import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Table2 } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { searchIndex, type SearchHit } from '@/lib/searchIndex';

export function CommandPalette() {
  const navigate = useNavigate();
  const { searchOpen, setSearchOpen } = useUIStore();
  const pages = useWorkspaceStore((s) => s.pages);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      setSelected(0);
    }
  }, [searchOpen]);

  const results = useMemo<SearchHit[]>(() => {
    if (!searchOpen) return [];
    if (!query.trim()) {
      // Recent pages when no query.
      return Object.values(pages)
        .filter((p) => !p.trashed)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 8)
        .map((p) => ({
          id: `page:${p.id}`,
          title: p.title || 'Sans titre',
          kind: 'page' as const,
          pageId: p.id,
        }));
    }
    // De-duplicate by target page so multiple row hits in one DB collapse.
    const hits = searchIndex.search(query);
    const seen = new Set<string>();
    const out: SearchHit[] = [];
    for (const h of hits) {
      const key = `${h.kind}:${h.pageId}:${h.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(h);
      if (out.length >= 14) break;
    }
    return out;
  }, [searchOpen, query, pages]);

  useEffect(() => setSelected(0), [results.length]);

  if (!searchOpen) return null;

  const go = (pageId: string) => {
    setSearchOpen(false);
    navigate(`/page/${pageId}`);
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
                if (r) go(r.pageId);
              } else if (e.key === 'Escape') {
                setSearchOpen(false);
              }
            }}
            placeholder="Rechercher pages, contenus et bases…"
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
                onClick={() => go(r.pageId)}
                className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm ${
                  i === selected ? 'bg-notion-hover dark:bg-notion-hover-dark' : ''
                }`}
              >
                {r.kind === 'row' ? (
                  <Table2 size={16} className="text-notion-muted" />
                ) : (
                  <FileText size={16} className="text-notion-muted" />
                )}
                <span className="flex-1 truncate">{r.title}</span>
                {r.kind === 'row' && (
                  <span className="shrink-0 rounded bg-notion-hover px-1.5 py-0.5 text-[10px] text-notion-muted dark:bg-notion-hover-dark">
                    base
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
