import path from 'path';
import fs from 'fs/promises';
import { createHash, randomBytes } from 'crypto';
import { app } from 'electron';
import { logger } from '../utils/logger';

// Local documents live under userData/Documents/{prefix}/{id}_{filename}.
// Der prefix ist die ersten 2 Zeichen der ID — verhindert dass ein Ordner
// nach 10.000 Files unbenutzbar langsam wird (Mac Finder, Windows Explorer).

const DOCUMENTS_DIR = 'Documents';

export function generateDocumentId(): string {
  // doc_<timestamp36><8byte-hex> — kollisionssicher genug fuer Local-Use,
  // konsistent mit Phase-7-Prompt generateId-Schema.
  return `doc_${Date.now().toString(36)}${randomBytes(8).toString('hex')}`;
}

export function getDocumentsRoot(): string {
  return path.join(app.getPath('userData'), DOCUMENTS_DIR);
}

export function getDocumentPath(id: string, filename: string): string {
  const prefix = id.slice(0, 2);
  // Filename sanitizen — entfernt path separators, behaelt extension.
  const safeFilename = filename.replace(/[\\/]/g, '_');
  return path.join(getDocumentsRoot(), prefix, `${id}_${safeFilename}`);
}

export async function ensureDocumentsDir(): Promise<void> {
  await fs.mkdir(getDocumentsRoot(), { recursive: true });
}

export interface SavedDocument {
  id: string;
  localPath: string;
  hash: string;
  size: number;
}

export async function saveDocumentFromBuffer(
  id: string,
  filename: string,
  content: Buffer,
): Promise<SavedDocument> {
  const localPath = getDocumentPath(id, filename);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, content);

  const hash = createHash('sha256').update(content).digest('hex');
  return { id, localPath, hash, size: content.length };
}

export async function saveDocumentFromPath(
  id: string,
  sourcePath: string,
): Promise<SavedDocument & { filename: string }> {
  const filename = path.basename(sourcePath);
  const content = await fs.readFile(sourcePath);
  const saved = await saveDocumentFromBuffer(id, filename, content);
  return { ...saved, filename };
}

export async function readDocument(id: string, filename: string): Promise<Buffer> {
  return fs.readFile(getDocumentPath(id, filename));
}

export async function deleteDocumentFile(id: string, filename: string): Promise<void> {
  try {
    await fs.unlink(getDocumentPath(id, filename));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw err;
  }
}

export async function verifyDocumentHash(
  id: string,
  filename: string,
  expectedHash: string,
): Promise<boolean> {
  try {
    const buf = await readDocument(id, filename);
    const actual = createHash('sha256').update(buf).digest('hex');
    return actual === expectedHash;
  } catch (err) {
    logger.warn(`verifyDocumentHash failed for ${id}:`, err);
    return false;
  }
}

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  txt: 'text/plain',
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function guessMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase().slice(1);
  return MIME_TYPES[ext] ?? 'application/octet-stream';
}
