import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Callout } from './extensions/Callout';
import { Column, Columns } from './extensions/Columns';
import { ImageBlock } from './extensions/ImageBlock';
import { FileBlock } from './extensions/FileBlock';
import { SlashCommand } from './slash/SlashCommand';
import { storeFile } from '@/lib/files';

interface EditorProps {
  content: unknown | null;
  onChange: (json: unknown) => void;
}

export function Editor({ content, onChange }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Custom horizontalRule keeps the default; nothing to disable here.
        codeBlock: { HTMLAttributes: { spellcheck: 'false' } },
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Callout,
      Columns,
      Column,
      ImageBlock,
      FileBlock,
      SlashCommand,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return 'Titre';
          return "Tapez '/' pour les commandes…";
        },
      }),
    ],
    content: (content as object) ?? '',
    autofocus: 'end',
    editorProps: {
      attributes: { class: 'ProseMirror focus:outline-none' },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        const image = files.find((f) => f.type.startsWith('image/'));
        if (!image) return false;
        event.preventDefault();
        void storeFile(image).then((fileId) => {
          editor?.chain().focus().insertContent({ type: 'image', attrs: { fileId, alt: image.name } }).run();
        });
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from((event as DragEvent).dataTransfer?.files ?? []);
        const image = files.find((f) => f.type.startsWith('image/'));
        if (!image) return false;
        event.preventDefault();
        void storeFile(image).then((fileId) => {
          editor?.chain().focus().insertContent({ type: 'image', attrs: { fileId, alt: image.name } }).run();
        });
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.getJSON()),
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-40">
      <EditorContent editor={editor} />
    </div>
  );
}
