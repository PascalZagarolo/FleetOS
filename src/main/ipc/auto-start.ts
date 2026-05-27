import { ipcMain } from 'electron';
import { IPC_CHANNELS_AUTO_START } from '../../shared/ipc-channels-tray';
import { setAutoStart, isAutoStartEnabled } from '../auto-start';

export function setupAutoStartHandlers(): void {
  ipcMain.handle(IPC_CHANNELS_AUTO_START.ENABLE, (_event, enabled: boolean) => {
    setAutoStart(enabled);
  });

  ipcMain.handle(IPC_CHANNELS_AUTO_START.STATUS, () => {
    return isAutoStartEnabled();
  });
}
