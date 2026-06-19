import { db } from '@/db/db';
import { newId } from '@/lib/id';
import type { FileBlob } from '@/types';

/** Persist an uploaded File as a Blob inside IndexedDB; returns its id. */
export async function storeFile(file: File): Promise<string> {
  const id = newId();
  const record: FileBlob = {
    id,
    name: file.name,
    mime: file.type,
    size: file.size,
    blob: file,
    createdAt: Date.now(),
  };
  await db.files.put(record);
  return id;
}

export async function getFile(id: string): Promise<FileBlob | undefined> {
  return db.files.get(id);
}

/** Open a native file picker, returning the chosen File (or null if cancelled). */
export function pickFile(accept = ''): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
