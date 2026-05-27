import { ipcMain } from 'electron';
import { IPC_CHANNELS_PREFERENCES } from '../../shared/ipc-channels-tray';
import { store } from '../utils/store';

export function setupPreferencesHandlers(): void {
  ipcMain.handle(IPC_CHANNELS_PREFERENCES.GET, (_event, key: string) => {
    return store.get(`preferences.${key}`);
  });

  ipcMain.handle(
    IPC_CHANNELS_PREFERENCES.SET,
    (_event, key: string, value: unknown) => {
      store.set(`preferences.${key}`, value);
    },
  );
}
