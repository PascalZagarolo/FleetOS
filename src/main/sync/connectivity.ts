import { net } from 'electron';
import { logger } from '../utils/logger';
import { windowRegistry } from '../windows/registry';
import { IPC_CHANNELS_CONNECTIVITY } from '../../shared/ipc-channels-sync';

// Electron hat keinen Push-Event fuer Online/Offline-Wechsel. Wir pollen
// net.isOnline() alle 5s und broadcasten an alle Windows wenn sich der
// State aendert. Das reicht fuer einen ehrlichen Status-Indicator.

const POLL_INTERVAL_MS = 5_000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let currentStatus: boolean = true;
let initialized = false;

export interface ConnectivityStatus {
  online: boolean;
  lastCheckedAt: number;
}

let lastCheckedAt = 0;

export function getConnectivityStatus(): ConnectivityStatus {
  return { online: currentStatus, lastCheckedAt };
}

export function startConnectivityWatcher(): void {
  if (pollTimer) {
    logger.warn('Connectivity watcher already running');
    return;
  }

  currentStatus = safeIsOnline();
  lastCheckedAt = Date.now();
  initialized = true;
  logger.info(`Connectivity initial state: ${currentStatus ? 'online' : 'offline'}`);

  pollTimer = setInterval(() => {
    const newStatus = safeIsOnline();
    lastCheckedAt = Date.now();
    if (newStatus !== currentStatus) {
      currentStatus = newStatus;
      logger.info(`Connectivity changed: ${newStatus ? 'online' : 'offline'}`);
      broadcastConnectivity(newStatus);
    }
  }, POLL_INTERVAL_MS);
}

export function stopConnectivityWatcher(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    initialized = false;
    logger.info('Connectivity watcher stopped');
  }
}

function safeIsOnline(): boolean {
  try {
    return net.isOnline();
  } catch (err) {
    // net.isOnline kann in headless/test envs werfen — pessimistisch
    // online-annehmen, sonst zeigen wir false-negatives.
    logger.warn('net.isOnline() failed, assuming online:', err);
    return true;
  }
}

function broadcastConnectivity(online: boolean): void {
  const payload = { online, lastCheckedAt: Date.now() };
  for (const entry of windowRegistry.getAll()) {
    try {
      entry.window.webContents.send(IPC_CHANNELS_CONNECTIVITY.CHANGED, payload);
    } catch {
      // webContents weg
    }
  }
}

export function isConnectivityWatcherRunning(): boolean {
  return initialized;
}
