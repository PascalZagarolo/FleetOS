import { ipcMain } from 'electron';
import { IPC_CHANNELS_CONNECTIVITY } from '../../shared/ipc-channels-sync';
import { getConnectivityStatus } from '../sync/connectivity';

export function setupConnectivityHandlers(): void {
  ipcMain.handle(IPC_CHANNELS_CONNECTIVITY.GET_STATUS, () => {
    return getConnectivityStatus();
  });
}
