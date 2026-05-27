import { ipcMain, app } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import type { AppInfo } from '../../shared/types';

export function setupAppInfoHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, () => app.getVersion());

  ipcMain.handle(IPC_CHANNELS.GET_APP_INFO, (): AppInfo => {
    return {
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      platform: process.platform,
      arch: process.arch,
      isPackaged: app.isPackaged,
    };
  });
}
