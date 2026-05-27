import { ipcMain } from 'electron';
import { IPC_CHANNELS_DOCUMENTS } from '../../shared/ipc-channels-documents';
import {
  importDocumentsFromFilesystem,
  readDocumentAsBase64,
  openDocumentInDefaultApp,
  exportDocumentToFile,
  deleteDocument,
  revealDocumentInFinder,
  getDocumentLocalPath,
  type ImportOptions,
} from '../documents/service';

export function setupDocumentHandlers(): void {
  ipcMain.handle(IPC_CHANNELS_DOCUMENTS.IMPORT, async (_event, options: ImportOptions = {}) => {
    return importDocumentsFromFilesystem(options);
  });

  ipcMain.handle(
    IPC_CHANNELS_DOCUMENTS.READ_BASE64,
    async (_event, payload: { id: string; filename: string }) => {
      return readDocumentAsBase64(payload.id, payload.filename);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS_DOCUMENTS.OPEN,
    async (_event, payload: { id: string; filename: string }) => {
      return openDocumentInDefaultApp(payload.id, payload.filename);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS_DOCUMENTS.EXPORT,
    async (
      _event,
      payload: { id: string; filename: string; parentWindowId?: string },
    ) => {
      return exportDocumentToFile(payload.id, payload.filename, {
        parentWindowId: payload.parentWindowId,
      });
    },
  );

  ipcMain.handle(
    IPC_CHANNELS_DOCUMENTS.DELETE,
    async (_event, payload: { id: string; filename: string }) => {
      await deleteDocument(payload.id, payload.filename);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS_DOCUMENTS.REVEAL,
    async (_event, payload: { id: string; filename: string }) => {
      await revealDocumentInFinder(payload.id, payload.filename);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS_DOCUMENTS.GET_LOCAL_PATH,
    (_event, payload: { id: string; filename: string }) => {
      return getDocumentLocalPath(payload.id, payload.filename);
    },
  );
}
