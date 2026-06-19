import { Node, mergeAttributes } from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from '@tiptap/react';
import { useEffect, useState } from 'react';
import { getFile } from '@/lib/files';

// Image block. Images uploaded by the user are stored as Blobs in IndexedDB
// and referenced by `fileId`. Object URLs are created lazily at render time
// and revoked on unmount, so nothing stale is ever persisted in the document.
function ImageComponent({ node }: NodeViewProps) {
  const fileId = node.attrs.fileId as string | null;
  const externalSrc = node.attrs.src as string | null;
  const [url, setUrl] = useState<string | null>(externalSrc);

  useEffect(() => {
    let objectUrl: string | null = null;
    let active = true;
    if (fileId) {
      void getFile(fileId).then((f) => {
        if (active && f) {
          objectUrl = URL.createObjectURL(f.blob);
          setUrl(objectUrl);
        }
      });
    }
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  return (
    <NodeViewWrapper className="daor-image-wrapper" data-drag-handle>
      {url ? (
        <img src={url} alt={(node.attrs.alt as string) || ''} draggable={false} />
      ) : (
        <div className="text-sm text-notion-muted py-4 px-2">Image indisponible…</div>
      )}
    </NodeViewWrapper>
  );
}

export const ImageBlock = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      fileId: { default: null },
      src: { default: null },
      alt: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    // Persisted markup never includes blob URLs — only the fileId / external src.
    return ['img', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent);
  },
});
