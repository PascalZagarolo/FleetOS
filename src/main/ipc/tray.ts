import { ipcMain } from 'electron';
import { IPC_CHANNELS_TRAY } from '../../shared/ipc-channels-tray';
import { updateTrayData, getTrayData } from '../tray';
import type { TrayData } from '../../shared/types';

export function setupTrayHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS_TRAY.UPDATE_TRAY_DATA,
    (_event, data: Partial<TrayData>) => {
      updateTrayData(data);
    },
  );

  ipcMain.handle(IPC_CHANNELS_TRAY.GET_TRAY_DATA, () => {
    return getTrayData();
  });
}
