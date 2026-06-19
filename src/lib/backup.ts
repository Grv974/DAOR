import { db } from '@/db/db';
import type { FileBlob, Page } from '@/types';
import { tiptapToMarkdown } from '@/lib/markdown';
import { createZip } from '@/lib/zip';

const BACKUP_VERSION = 1;

interface SerializedFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  dataBase64: string;
}

interface BackupFile {
  version: number;
  exportedAt: string;
  pages: Page[];
  files: SerializedFile[];
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Full workspace backup as a single JSON file (pages + embedded files). */
export async function exportJSON(): Promise<void> {
  const pages = await db.pages.toArray();
  const fileRecords = await db.files.toArray();
  const files: SerializedFile[] = await Promise.all(
    fileRecords.map(async (f) => ({
      id: f.id,
      name: f.name,
      mime: f.mime,
      size: f.size,
      dataBase64: await blobToBase64(f.blob),
    })),
  );
  const backup: BackupFile = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    pages,
    files,
  };
  downloadBlob(
    new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
    `daor-backup-${new Date().toISOString().slice(0, 10)}.json`,
  );
}

/** Restore a workspace from a JSON backup. Returns number of pages imported. */
export async function importJSON(text: string): Promise<number> {
  const data = JSON.parse(text) as BackupFile;
  if (!data.pages || !Array.isArray(data.pages)) {
    throw new Error('Fichier de sauvegarde invalide.');
  }
  await db.transaction('rw', db.pages, db.files, async () => {
    await db.pages.bulkPut(data.pages);
    if (Array.isArray(data.files)) {
      const restored: FileBlob[] = data.files.map((f) => ({
        id: f.id,
        name: f.name,
        mime: f.mime,
        size: f.size,
        blob: base64ToBlob(f.dataBase64, f.mime),
        createdAt: Date.now(),
      }));
      await db.files.bulkPut(restored);
    }
  });
  return data.pages.length;
}

function slugify(title: string, fallback: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || fallback;
}

/**
 * Export every page as a Markdown file inside a folder hierarchy that mirrors
 * the page tree — a structure ready to commit into a GitHub repository.
 */
export function exportMarkdownZip(pages: Page[], rootOrder: string[]): void {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const files: { name: string; content: string }[] = [];

  const walk = (id: string, prefix: string) => {
    const page = byId.get(id);
    if (!page || page.trashed) return;
    const slug = slugify(page.title, page.id);
    const hasChildren = page.childrenOrder.length > 0;
    const base = prefix ? `${prefix}/${slug}` : slug;
    const filePath = hasChildren ? `${base}/index.md` : `${base}.md`;
    const heading = `# ${page.title || 'Sans titre'}\n\n`;
    files.push({ name: filePath, content: heading + tiptapToMarkdown(page.content) });
    page.childrenOrder.forEach((childId) => walk(childId, base));
  };

  rootOrder.forEach((id) => walk(id, ''));

  const readme =
    '# DAOR Export\n\n' +
    `Exporté le ${new Date().toISOString()}.\n\n` +
    'Ce dossier contient une page Markdown par page de l\'espace de travail.\n' +
    'Les liens `daor-file:<id>` réfèrent aux fichiers stockés localement dans le navigateur.\n';
  files.push({ name: 'README.md', content: readme });

  downloadBlob(createZip(files), `daor-markdown-${new Date().toISOString().slice(0, 10)}.zip`);
}

/** Export a single page as a Markdown file. */
export function exportPageMarkdown(page: Page): void {
  const heading = `# ${page.title || 'Sans titre'}\n\n`;
  downloadBlob(
    new Blob([heading + tiptapToMarkdown(page.content)], { type: 'text/markdown' }),
    `${slugify(page.title, page.id)}.md`,
  );
}
