import { useNavigate, useParams } from 'react-router-dom';
import { useCallback } from 'react';
import { Smile, Star } from 'lucide-react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Editor } from '@/editor/Editor';
import { DatabaseView } from '@/components/database/DatabaseView';

const QUICK_EMOJIS = ['📄', '📝', '📌', '💡', '🚀', '📚', '✅', '🎯', '🗂️', '⭐'];

export function PageView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const page = useWorkspaceStore((s) => (id ? s.pages[id] : undefined));
  const updatePage = useWorkspaceStore((s) => s.updatePage);
  const updateContent = useWorkspaceStore((s) => s.updateContent);
  const toggleFavorite = useWorkspaceStore((s) => s.toggleFavorite);
  const createPage = useWorkspaceStore((s) => s.createPage);

  const onChange = useCallback(
    (json: unknown) => {
      if (id) updateContent(id, json);
    },
    [id, updateContent],
  );

  if (!id || !page || page.trashed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-notion-muted">
        <p>Page introuvable.</p>
        <button
          type="button"
          onClick={async () => navigate(`/page/${await createPage(null)}`)}
          className="rounded bg-notion-accent px-3 py-1.5 text-sm text-white"
        >
          Créer une page
        </button>
      </div>
    );
  }

  const setIcon = () => {
    const pick = window.prompt('Emoji de l\'icône (laisser vide pour retirer) :', page.icon ?? '');
    if (pick === null) return;
    updatePage(id, { icon: pick.trim() || null });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-6 pt-16">
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={setIcon}
            className="flex h-10 w-10 items-center justify-center rounded text-3xl hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
            title="Changer l'icône"
          >
            {page.icon ?? <Smile size={22} className="text-notion-muted" />}
          </button>
          <button
            type="button"
            onClick={() => toggleFavorite(id)}
            className="rounded p-1.5 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
            title="Favori"
          >
            <Star
              size={18}
              className={page.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-notion-muted'}
            />
          </button>
        </div>

        {!page.icon && (
          <div className="mb-1 flex flex-wrap gap-1">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => updatePage(id, { icon: e })}
                className="rounded px-1 text-lg opacity-40 hover:opacity-100"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        <textarea
          value={page.title}
          onChange={(e) => updatePage(id, { title: e.target.value })}
          placeholder="Sans titre"
          rows={1}
          className="w-full resize-none bg-transparent text-4xl font-bold outline-none placeholder:text-notion-muted/50"
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
          }}
        />
      </div>

      {page.type === 'database' ? (
        <div className="mt-6">
          <DatabaseView pageId={id} />
        </div>
      ) : (
        /* Remount the editor per page so content swaps cleanly. */
        <Editor key={id} content={page.content} onChange={onChange} />
      )}
    </div>
  );
}
