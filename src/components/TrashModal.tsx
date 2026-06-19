import { RotateCcw, Trash2, X } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export function TrashModal() {
  const { trashOpen, setTrashOpen } = useUIStore();
  const pages = useWorkspaceStore((s) => s.pages);
  const restorePage = useWorkspaceStore((s) => s.restorePage);
  const purgePage = useWorkspaceStore((s) => s.purgePage);

  if (!trashOpen) return null;

  // Show only the roots of trashed subtrees (a trashed page whose parent is not
  // itself trashed) to avoid listing every nested descendant separately.
  const trashed = Object.values(pages)
    .filter((p) => p.trashed)
    .filter((p) => !p.parentId || !pages[p.parentId]?.trashed)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh]"
      onClick={() => setTrashOpen(false)}
    >
      <div
        className="flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-notion-border bg-white shadow-2xl dark:border-notion-border-dark dark:bg-[#202020]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-notion-border px-5 py-3 dark:border-notion-border-dark">
          <h2 className="text-lg font-semibold">Corbeille</h2>
          <button
            type="button"
            onClick={() => setTrashOpen(false)}
            className="rounded p-1 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-3 py-3">
          {trashed.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-notion-muted">La corbeille est vide.</p>
          ) : (
            trashed.map((p) => (
              <div
                key={p.id}
                className="group flex items-center gap-2 rounded px-2 py-1.5 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
              >
                <span className="flex-1 truncate text-sm">
                  {p.icon ? `${p.icon} ` : ''}
                  {p.title || 'Sans titre'}
                </span>
                <button
                  type="button"
                  onClick={() => void restorePage(p.id)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-notion-muted hover:bg-black/10 dark:hover:bg-white/10"
                  title="Restaurer"
                >
                  <RotateCcw size={13} /> Restaurer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Supprimer définitivement « ${p.title || 'Sans titre'} » et ses sous-pages ?`))
                      void purgePage(p.id);
                  }}
                  className="rounded p-1 text-notion-muted hover:text-red-600"
                  title="Supprimer définitivement"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
