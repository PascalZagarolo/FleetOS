import { ipcMain } from 'electron';
import { IPC_CHANNELS_UPDATER } from '../../shared/ipc-channels-updater';
import {
  cancelUpdate,
  checkForUpdatesManually,
  getUpdateState,
  quitAndInstall,
} from '../updater';

export function setupUpdaterHandlers(): void {
  ipcMain.handle(IPC_CHANNELS_UPDATER.CHECK_FOR_UPDATES, async () => {
    return checkForUpdatesManually();
  });

  ipcMain.handle(IPC_CHANNELS_UPDATER.GET_UPDATE_STATE, () => {
    return getUpdateState();
  });

  ipcMain.handle(IPC_CHANNELS_UPDATER.QUIT_AND_INSTALL, () => {
    quitAndInstall();
  });

  ipcMain.handle(IPC_CHANNELS_UPDATER.CANCEL_UPDATE, () => {
    cancelUpdate();
  });
}
