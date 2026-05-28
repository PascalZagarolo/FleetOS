import { ipcMain } from 'electron';
import { IPC_CHANNELS_BADGE } from '../../shared/ipc-channels-tray';
import { setAppBadge } from '../badge';
import type { BadgePayload } from '../../shared/types';

export function setupBadgeHandlers(): void {
  ipcMain.handle(IPC_CHANNELS_BADGE.SET, (_event, payload: BadgePayload) => {
    setAppBadge(payload);
  });
}
