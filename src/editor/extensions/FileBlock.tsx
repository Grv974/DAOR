import { Node, mergeAttributes } from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react';
import { Download, FileIcon } from 'lucide-react';
import { getFile, humanSize } from '@/lib/files';

// Downloadable file attachment. The blob lives in IndexedDB; clicking
// "download" materialises a temporary object URL on demand.
function FileComponent({ node }: NodeViewProps) {
  const fileId = node.attrs.fileId as string | null;
  const name = (node.attrs.name as string) || 'Fichier';
  const size = (node.attrs.size as number) || 0;

  const download = async () => {
    if (!fileId) return;
    const f = await getFile(fileId);
    if (!f) return;
    const url = URL.createObjectURL(f.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <NodeViewWrapper
      className="daor-file-block my-1 flex items-center gap-3 rounded-md border border-notion-border dark:border-notion-border-dark px-3 py-2"
      contentEditable={false}
      data-drag-handle
    >
      <FileIcon size={18} className="text-notion-muted shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{name}</div>
        <div className="text-xs text-notion-muted">{humanSize(size)}</div>
      </div>
      <button
        type="button"
        onClick={download}
        className="rounded p-1 hover:bg-notion-hover dark:hover:bg-notion-hover-dark"
        title="Télécharger"
      >
        <Download size={16} />
      </button>
    </NodeViewWrapper>
  );
}

export const FileBlock = Node.create({
  name: 'fileBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      fileId: { default: null },
      name: { default: '' },
      size: { default: 0 },
      mime: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="file-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'file-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileComponent);
  },
});
