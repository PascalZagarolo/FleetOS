import { autoUpdater } from 'electron-updater';
import type { UpdateInfo as ElectronUpdateInfo, ProgressInfo as ElectronProgressInfo } from 'electron-updater';
import { logger } from '../utils/logger';
import { isDevelopment } from '../utils/env';
import { getMainWindow } from '../window-manager';
import { IPC_CHANNELS_UPDATER } from '../../shared/ipc-channels-updater';
import type { UpdateInfo, ProgressInfo, UpdateState } from '../../shared/types';

let currentState: UpdateState = { status: 'idle' };
let updateCheckInterval: ReturnType<typeof setInterval> | null = null;

const INITIAL_CHECK_DELAY_MS = 10 * 1000;
const PERIODIC_CHECK_INTERVAL_MS = 60 * 60 * 1000;

function toUpdateInfo(info: ElectronUpdateInfo): UpdateInfo {
  return {
    version: info.version,
    releaseDate: info.releaseDate,
    releaseName: info.releaseName ?? undefined,
    releaseNotes:
      typeof info.releaseNotes === 'string'
        ? info.releaseNotes
        : null,
  };
}

function toProgressInfo(p: ElectronProgressInfo): ProgressInfo {
  return {
    total: p.total,
    delta: p.delta,
    transferred: p.transferred,
    percent: p.percent,
    bytesPerSecond: p.bytesPerSecond,
  };
}

export function setupAutoUpdater(): void {
  if (isDevelopment) {
    logger.info('Auto-updater disabled in development');
    return;
  }

  // electron-log und electron-updater haben kompatible logger interfaces,
  // aber das Type-System schreit. Cast ist sicher.
  autoUpdater.logger = logger as unknown as typeof autoUpdater.logger;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.channel = 'latest';

  // Unsigned pilot builds: electron-updater's NsisUpdater verifies the
  // downloaded installer is Authenticode-signed by `publisherName` and
  // otherwise REJECTS it ("New version X is not signed by the application
  // owner"). With no code-signing cert yet, that breaks every auto-update.
  // Accept the update regardless — integrity is still guaranteed by the
  // sha512 in latest.yml + HTTPS delivery from GitHub Releases.
  // REMOVE this override once builds are code-signed.
  if (process.platform === 'win32') {
    (
      autoUpdater as unknown as {
        verifyUpdateCodeSignature?: (
          publisherName: string[],
          path: string,
        ) => Promise<string | null>;
      }
    ).verifyUpdateCodeSignature = () => Promise.resolve(null);
  }

  setupUpdaterEvents();

  setTimeout(() => {
    void checkForUpdates();
  }, INITIAL_CHECK_DELAY_MS);

  updateCheckInterval = setInterval(() => {
    void checkForUpdates();
  }, PERIODIC_CHECK_INTERVAL_MS);

  logger.info('Auto-updater initialized');
}

function setupUpdaterEvents(): void {
  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for updates');
    setState({ status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    const mapped = toUpdateInfo(info);
    logger.info(`Update available: ${mapped.version}`);
    setState({ status: 'available', info: mapped });
    sendToRenderer(IPC_CHANNELS_UPDATER.UPDATE_AVAILABLE, mapped);
  });

  autoUpdater.on('update-not-available', () => {
    logger.info('No updates available');
    setState({ status: 'not-available' });
    sendToRenderer(IPC_CHANNELS_UPDATER.UPDATE_NOT_AVAILABLE);
  });

  autoUpdater.on('download-progress', (progress) => {
    const mapped = toProgressInfo(progress);
    logger.info(`Download progress: ${mapped.percent.toFixed(1)}%`);
    setState({ status: 'downloading', progress: mapped });
    sendToRenderer(IPC_CHANNELS_UPDATER.UPDATE_DOWNLOAD_PROGRESS, mapped);
  });

  autoUpdater.on('update-downloaded', (info) => {
    const mapped = toUpdateInfo(info);
    logger.info(`Update downloaded: ${mapped.version}`);
    setState({ status: 'downloaded', info: mapped });
    sendToRenderer(IPC_CHANNELS_UPDATER.UPDATE_DOWNLOADED, mapped);
  });

  autoUpdater.on('error', (error) => {
    logger.error('Update error:', error);
    setState({ status: 'error', error: error.message });
    sendToRenderer(IPC_CHANNELS_UPDATER.UPDATE_ERROR, error.message);
  });
}

function setState(state: UpdateState): void {
  currentState = state;
}

export function getUpdateState(): UpdateState {
  return currentState;
}

export async function checkForUpdates(): Promise<void> {
  if (isDevelopment) {
    logger.debug('Skipping update check in development');
    return;
  }
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    logger.error('Failed to check for updates:', error);
  }
}

export async function checkForUpdatesManually(): Promise<UpdateState> {
  if (isDevelopment) {
    return { status: 'not-available' };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result?.updateInfo) {
      return { status: 'available', info: toUpdateInfo(result.updateInfo) };
    }
    return { status: 'not-available' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { status: 'error', error: message };
  }
}

export function quitAndInstall(): void {
  logger.info('Quitting and installing update');
  autoUpdater.quitAndInstall(false, true);
}

export function cancelUpdate(): void {
  logger.info('Update cancelled by user');
  // electron-updater hat keine Cancel-API fuer laufenden Download.
  // State zuruecksetzen reicht, der naechste check-Cycle wird ihn neu
  // anlegen falls Update weiterhin verfuegbar ist.
  setState({ status: 'idle' });
}

export function teardownAutoUpdater(): void {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
}

function sendToRenderer(channel: string, ...args: unknown[]): void {
  const window = getMainWindow();
  if (window && !window.isDestroyed()) {
    window.webContents.send(channel, ...args);
  }
}
