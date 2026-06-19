import type { Editor, Range } from '@tiptap/core';
import {
  CheckSquare,
  Code2,
  Columns2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  type LucideIcon,
  Minus,
  Paperclip,
  Quote,
  Table as TableIcon,
  Lightbulb,
  Type,
} from 'lucide-react';
import { pickFile, storeFile } from '@/lib/files';

export interface SlashItem {
  title: string;
  description: string;
  icon: LucideIcon;
  searchTerms: string[];
  command: (props: { editor: Editor; range: Range }) => void;
}

const SLASH_ITEMS: SlashItem[] = [
  {
    title: 'Texte',
    description: 'Paragraphe simple',
    icon: Type,
    searchTerms: ['texte', 'text', 'paragraphe', 'p'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: 'Titre 1',
    description: 'Grand titre de section',
    icon: Heading1,
    searchTerms: ['titre', 'h1', 'heading'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    title: 'Titre 2',
    description: 'Sous-titre moyen',
    icon: Heading2,
    searchTerms: ['titre', 'h2', 'heading'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    title: 'Titre 3',
    description: 'Petit sous-titre',
    icon: Heading3,
    searchTerms: ['titre', 'h3', 'heading'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    title: 'Liste à puces',
    description: 'Liste non ordonnée',
    icon: List,
    searchTerms: ['liste', 'puce', 'bullet', 'ul'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: 'Liste numérotée',
    description: 'Liste ordonnée',
    icon: ListOrdered,
    searchTerms: ['liste', 'numero', 'ordered', 'ol'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: 'Checklist',
    description: 'Liste de tâches à cocher',
    icon: CheckSquare,
    searchTerms: ['todo', 'tâche', 'tache', 'checklist', 'check'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: 'Citation',
    description: 'Bloc de citation',
    icon: Quote,
    searchTerms: ['citation', 'quote', 'blockquote'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: 'Code',
    description: 'Bloc de code',
    icon: Code2,
    searchTerms: ['code', 'pre'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: 'Callout',
    description: 'Encadré avec emoji',
    icon: Lightbulb,
    searchTerms: ['callout', 'encadré', 'note', 'info'],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'callout',
          attrs: { emoji: '💡' },
          content: [{ type: 'paragraph' }],
        })
        .run(),
  },
  {
    title: 'Séparateur',
    description: 'Ligne horizontale',
    icon: Minus,
    searchTerms: ['séparateur', 'separateur', 'divider', 'hr', 'ligne'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: 'Tableau',
    description: 'Tableau 3×3 simple',
    icon: TableIcon,
    searchTerms: ['tableau', 'table', 'grille'],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: 'Colonnes',
    description: 'Deux colonnes côte à côte',
    icon: Columns2,
    searchTerms: ['colonne', 'columns', 'layout'],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'columns',
          content: [
            { type: 'column', content: [{ type: 'paragraph' }] },
            { type: 'column', content: [{ type: 'paragraph' }] },
          ],
        })
        .run(),
  },
  {
    title: 'Image',
    description: 'Importer une image (stockée localement)',
    icon: ImageIcon,
    searchTerms: ['image', 'photo', 'img', 'upload'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      void pickFile('image/*').then(async (file) => {
        if (!file) return;
        const fileId = await storeFile(file);
        editor.chain().focus().insertContent({ type: 'image', attrs: { fileId, alt: file.name } }).run();
      });
    },
  },
  {
    title: 'Fichier',
    description: 'Joindre un fichier (stocké localement)',
    icon: Paperclip,
    searchTerms: ['fichier', 'file', 'pièce jointe', 'attachment', 'upload'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      void pickFile('').then(async (file) => {
        if (!file) return;
        const fileId = await storeFile(file);
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'fileBlock',
            attrs: { fileId, name: file.name, size: file.size, mime: file.type },
          })
          .run();
      });
    },
  },
];

export function filterSlashItems(query: string): SlashItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.searchTerms.some((t) => t.toLowerCase().includes(q)),
  );
}
