import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS_BROADCAST } from '../../shared/ipc-channels-windows';
import { broadcastToWindows } from '../windows/broadcast';
import { windowRegistry } from '../windows/registry';
import type { BroadcastMessage } from '../../shared/window-types';

export function setupBroadcastHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS_BROADCAST.SEND,
    (
      event,
      message: Omit<BroadcastMessage, 'source'>,
    ) => {
      const sender = BrowserWindow.fromWebContents(event.sender);
      let sourceId: string | undefined;
      if (sender) {
        const entry = windowRegistry.findByBrowserWindow(sender);
        sourceId = entry?.config.id;
      }
      broadcastToWindows({ ...message, source: sourceId });
    },
  );
}
