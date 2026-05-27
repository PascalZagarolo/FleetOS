import { ipcMain } from 'electron';
import { IPC_CHANNELS_SHORTCUTS } from '../../shared/ipc-channels-tray';
import { getShortcutDefinitions, updateShortcut, resetShortcut } from '../shortcuts';

export function setupShortcutHandlers(): void {
  ipcMain.handle(IPC_CHANNELS_SHORTCUTS.GET_ALL, () => {
    return getShortcutDefinitions();
  });

  ipcMain.handle(
    IPC_CHANNELS_SHORTCUTS.UPDATE,
    (_event, id: string, accelerator: string) => {
      return updateShortcut(id, accelerator);
    },
  );

  ipcMain.handle(IPC_CHANNELS_SHORTCUTS.RESET, (_event, id: string) => {
    return resetShortcut(id);
  });
}
