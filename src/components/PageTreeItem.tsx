import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, FileText, MoreHorizontal, Plus, Star, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

interface PageTreeItemProps {
  pageId: string;
  depth: number;
}

// Shared across instances: the page currently being dragged.
let draggedId: string | null = null;
type DropZone = 'top' | 'middle' | 'bottom' | null;

export function PageTreeItem({ pageId, depth }: PageTreeItemProps) {
  const navigate = useNavigate();
  const { id: activeId } = useParams();
  const page = useWorkspaceStore((s) => s.pages[pageId]);
  const createPage = useWorkspaceStore((s) => s.createPage);
  const trashPage = useWorkspaceStore((s) => s.trashPage);
  const toggleFavorite = useWorkspaceStore((s) => s.toggleFavorite);
  const movePage = useWorkspaceStore((s) => s.movePage);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropZone, setDropZone] = useState<DropZone>(null);

  const handleDragOver = (e: React.DragEvent) => {
    if (!draggedId || draggedId === pageId) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    setDropZone(ratio < 0.3 ? 'top' : ratio > 0.7 ? 'bottom' : 'middle');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const dragId = draggedId;
    const zone = dropZone;
    draggedId = null;
    setDropZone(null);
    if (!dragId || dragId === pageId || !zone) return;

    const st = useWorkspaceStore.getState();
    const target = st.pages[pageId];
    if (!target) return;

    if (zone === 'middle') {
      // Nest the dragged page as a child of this one.
      st.movePage(dragId, pageId, target.childrenOrder.length);
      setExpanded(true);
      return;
    }
    // Reorder as a sibling (before/after this page).
    const parentId = target.parentId;
    const list = parentId ? (st.pages[parentId]?.childrenOrder ?? []) : st.rootOrder;
    const filtered = list.filter((x) => x !== dragId);
    let tIdx = filtered.indexOf(pageId);
    if (tIdx < 0) tIdx = filtered.length;
    movePage(dragId, parentId, zone === 'bottom' ? tIdx + 1 : tIdx);
  };

  if (!page || page.trashed) return null;

  const children = page.childrenOrder;
  const hasChildren = children.length > 0;
  const isActive = activeId === pageId;

  const addChild = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const childId = await createPage(pageId);
    setExpanded(true);
    navigate(`/page/${childId}`);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        draggable
        onDragStart={(e) => {
          draggedId = pageId;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', pageId);
          e.stopPropagation();
        }}
        onDragEnd={() => {
          draggedId = null;
          setDropZone(null);
        }}
        onDragOver={handleDragOver}
        onDragLeave={() => setDropZone(null)}
        onDrop={handleDrop}
        onClick={() => navigate(`/page/${pageId}`)}
        onKeyDown={(e) => e.key === 'Enter' && navigate(`/page/${pageId}`)}
        className={`group flex items-center gap-1 rounded px-1 py-1 text-sm ${
          isActive
            ? 'bg-notion-hover font-medium dark:bg-notion-hover-dark'
            : 'hover:bg-notion-hover dark:hover:bg-notion-hover-dark'
        } ${dropZone === 'middle' ? 'ring-2 ring-inset ring-notion-accent' : ''} ${
          dropZone === 'top' ? 'border-t-2 border-notion-accent' : ''
        } ${dropZone === 'bottom' ? 'border-b-2 border-notion-accent' : ''}`}
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10"
        >
          {hasChildren ? (
            <ChevronRight
              size={14}
              className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          ) : page.icon ? (
            <span className="text-[13px]">{page.icon}</span>
          ) : (
            <FileText size={14} className="text-notion-muted" />
          )}
        </button>
        {page.icon && hasChildren && <span className="text-[13px]">{page.icon}</span>}
        <span className="flex-1 truncate">{page.title || 'Sans titre'}</span>

        <div className="relative flex items-center opacity-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
            title="Options"
          >
            <MoreHorizontal size={15} />
          </button>
          <button
            type="button"
            onClick={addChild}
            className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
            title="Ajouter une sous-page"
          >
            <Plus size={15} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
              <div className="absolute right-0 top-6 z-20 w-44 rounded-md border border-notion-border bg-white py-1 shadow-lg dark:border-notion-border-dark dark:bg-[#252525]">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(pageId); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
                >
                  <Star size={14} className={page.favorite ? 'fill-yellow-400 text-yellow-400' : ''} />
                  {page.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    void trashPage(pageId);
                    if (isActive) navigate('/');
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
                >
                  <Trash2 size={14} />
                  Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {expanded &&
        children.map((childId) => (
          <PageTreeItem key={childId} pageId={childId} depth={depth + 1} />
        ))}
    </div>
  );
}
