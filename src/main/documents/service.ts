import fs from 'fs/promises';
import path from 'path';
import { BrowserWindow, dialog, shell } from 'electron';
import { logger } from '../utils/logger';
import { getMainWindow } from '../window-manager';
import {
  ensureDocumentsDir,
  generateDocumentId,
  guessMimeType,
  saveDocumentFromPath,
  readDocument,
  deleteDocumentFile,
  getDocumentPath,
} from './storage';

export interface DocumentHandle {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  hash: string;
  localPath: string;
}

export interface ImportOptions {
  multiple?: boolean;
  filters?: Array<{ name: string; extensions: string[] }>;
  parentWindowId?: string;
}

const DEFAULT_FILTERS = [
  { name: 'PDF', extensions: ['pdf'] },
  { name: 'Bilder', extensions: ['jpg', 'jpeg', 'png', 'heic', 'webp'] },
  { name: 'Office', extensions: ['docx', 'xlsx', 'csv'] },
  { name: 'Alle Dateien', extensions: ['*'] },
];

// Native File-Picker -> liest gewaehlte Files in Buffer -> speichert in
// userData/Documents -> returnt Handles. Kein Upload, kein DB-Eintrag —
// die Webapp entscheidet was als naechstes passiert (per-entity-Upload
// auf existierende Routes, lokal halten, etc.).
export async function importDocumentsFromFilesystem(
  options: ImportOptions = {},
): Promise<DocumentHandle[]> {
  await ensureDocumentsDir();

  const parent = resolveParentWindow(options.parentWindowId);
  const dialogOptions = {
    title: 'Dokument(e) auswaehlen',
    filters: options.filters ?? DEFAULT_FILTERS,
    properties: (options.multiple
      ? ['openFile', 'multiSelections']
      : ['openFile']) as Array<'openFile' | 'multiSelections'>,
  };

  const result = parent
    ? await dialog.showOpenDialog(parent, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions);

  if (result.canceled || result.filePaths.length === 0) {
    return [];
  }

  const handles: DocumentHandle[] = [];
  for (const sourcePath of result.filePaths) {
    try {
      const id = generateDocumentId();
      const saved = await saveDocumentFromPath(id, sourcePath);
      handles.push({
        id: saved.id,
        filename: saved.filename,
        mimeType: guessMimeType(saved.filename),
        size: saved.size,
        hash: saved.hash,
        localPath: saved.localPath,
      });
    } catch (err) {
      logger.error(`Failed to import ${sourcePath}:`, err);
    }
  }

  logger.info(`Imported ${handles.length} document(s)`);
  return handles;
}

// Liest die Bytes eines bereits importierten Dokuments. Returnt das Buffer
// als Base64-String — IPC kann keine rohen Buffer ohne weiteres reichen,
// aber Base64 ist zuverlaessig auch fuer grosse Files (electron-builder
// erlaubt das ueber contextBridge).
export async function readDocumentAsBase64(
  id: string,
  filename: string,
): Promise<string | null> {
  try {
    const buf = await readDocument(id, filename);
    return buf.toString('base64');
  } catch (err) {
    logger.warn(`readDocumentAsBase64 failed for ${id}:`, err);
    return null;
  }
}

export async function openDocumentInDefaultApp(
  id: string,
  filename: string,
): Promise<{ ok: boolean; error?: string }> {
  const fullPath = getDocumentPath(id, filename);
  try {
    await fs.access(fullPath);
  } catch {
    return { ok: false, error: 'File not found' };
  }
  const result = await shell.openPath(fullPath);
  if (result) {
    return { ok: false, error: result };
  }
  return { ok: true };
}

export async function exportDocumentToFile(
  id: string,
  filename: string,
  options: { parentWindowId?: string } = {},
): Promise<{ ok: boolean; targetPath?: string; error?: string }> {
  const sourcePath = getDocumentPath(id, filename);
  try {
    await fs.access(sourcePath);
  } catch {
    return { ok: false, error: 'File not found' };
  }

  const parent = resolveParentWindow(options.parentWindowId);
  const dialogOptions = {
    title: 'Dokument speichern unter',
    defaultPath: filename,
  };

  const result = parent
    ? await dialog.showSaveDialog(parent, dialogOptions)
    : await dialog.showSaveDialog(dialogOptions);

  if (result.canceled || !result.filePath) {
    return { ok: false, error: 'cancelled' };
  }

  try {
    await fs.copyFile(sourcePath, result.filePath);
    return { ok: true, targetPath: result.filePath };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function deleteDocument(id: string, filename: string): Promise<void> {
  await deleteDocumentFile(id, filename);
}

export async function revealDocumentInFinder(
  id: string,
  filename: string,
): Promise<void> {
  const fullPath = getDocumentPath(id, filename);
  try {
    await fs.access(fullPath);
    shell.showItemInFolder(fullPath);
  } catch (err) {
    logger.warn(`revealDocumentInFinder failed for ${id}:`, err);
  }
}

function resolveParentWindow(parentWindowId?: string): BrowserWindow | null {
  if (parentWindowId) {
    try {
      const registry = require('../windows/registry') as typeof import('../windows/registry');
      return registry.windowRegistry.get(parentWindowId);
    } catch {
      return null;
    }
  }
  return getMainWindow();
}

export function getDocumentLocalPath(id: string, filename: string): string {
  return getDocumentPath(id, filename);
}
