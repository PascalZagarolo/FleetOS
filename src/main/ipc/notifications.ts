import { ipcMain } from 'electron';
import { IPC_CHANNELS_NOTIFICATIONS } from '../../shared/ipc-channels-tray';
import {
  showRichNotification,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  getNotificationPreferences,
  setNotificationPreferences,
  setDndSettings,
} from '../notifications';
import type { RichNotificationOptions, DndSettings } from '../../shared/types';

export function setupNotificationHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS_NOTIFICATIONS.SHOW,
    (_event, options: RichNotificationOptions) => {
      showRichNotification(options);
    },
  );

  ipcMain.handle(IPC_CHANNELS_NOTIFICATIONS.GET_PERMISSION_STATUS, () => {
    return getNotificationPermissionStatus();
  });

  ipcMain.handle(IPC_CHANNELS_NOTIFICATIONS.REQUEST_PERMISSION, async () => {
    return requestNotificationPermission();
  });

  ipcMain.handle(IPC_CHANNELS_NOTIFICATIONS.GET_PREFERENCES, () => {
    return getNotificationPreferences();
  });

  ipcMain.handle(
    IPC_CHANNELS_NOTIFICATIONS.SET_PREFERENCES,
    (_event, prefs: Record<string, boolean>) => {
      setNotificationPreferences(prefs);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS_NOTIFICATIONS.SET_DND,
    (_event, dnd: DndSettings) => {
      setDndSettings(dnd);
    },
  );
}
