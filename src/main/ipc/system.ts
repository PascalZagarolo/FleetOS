import { ipcMain, shell } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import type { OpenExternalResult } from '../../shared/types';

export function setupSystemHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_PLATFORM, () => process.platform);

  ipcMain.handle(
    IPC_CHANNELS.OPEN_EXTERNAL,
    async (_event, url: string): Promise<OpenExternalResult> => {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:' && parsed.protocol !== 'mailto:') {
          return { success: false, error: 'Invalid protocol' };
        }
        await shell.openExternal(url);
        return { success: true };
      } catch {
        return { success: false, error: 'Invalid URL' };
      }
    },
  );
}
