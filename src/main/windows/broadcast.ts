import { logger } from '../utils/logger';
import { windowRegistry } from './registry';
import { IPC_CHANNELS_BROADCAST } from '../../shared/ipc-channels-windows';
import type { BroadcastMessage } from '../../shared/window-types';

export function broadcastToWindows(message: BroadcastMessage): void {
  const entries = windowRegistry.getAll();
  let delivered = 0;

  for (const entry of entries) {
    if (message.excludeSource && entry.config.id === message.source) continue;
    if (message.targets && !message.targets.includes(entry.config.id)) continue;

    try {
      entry.window.webContents.send(IPC_CHANNELS_BROADCAST.MESSAGE, {
        type: message.type,
        payload: message.payload,
        source: message.source,
      });
      delivered++;
    } catch (err) {
      logger.warn(`Broadcast to ${entry.config.id} failed:`, err);
    }
  }

  logger.debug(`Broadcast ${message.type} -> ${delivered}/${entries.length} windows`);
}
