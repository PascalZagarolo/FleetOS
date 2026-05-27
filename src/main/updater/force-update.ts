import { app, dialog, shell } from 'electron';
import semver from 'semver';
import { logger } from '../utils/logger';
import { getMainWindow } from '../window-manager';
import { APP_CONFIG } from '../../shared/constants';

// Webapp-Endpoint liefert die Mindest-Desktop-Version. Liegt diese ueber
// der aktuell installierten Version, ist die App nicht mehr nutzbar
// (typisch bei Security-Hotfixes oder Breaking-Changes im Auth-Layer).
const MIN_VERSION_CHECK_URL = `${APP_CONFIG.productionUrl}/api/app/min-version`;
const PERIODIC_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
const INITIAL_CHECK_DELAY_MS = 5 * 1000;

type MinVersionResponse = {
  minVersion: string;
  message?: string;
};

let minVersionCheckInterval: ReturnType<typeof setInterval> | null = null;

async function fetchMinVersion(): Promise<MinVersionResponse | null> {
  try {
    const response = await fetch(MIN_VERSION_CHECK_URL, {
      headers: {
        'User-Agent': `FleetOS/${app.getVersion()}`,
      },
    });
    if (!response.ok) {
      logger.warn(`Min-version check failed: ${response.status}`);
      return null;
    }
    return (await response.json()) as MinVersionResponse;
  } catch (error) {
    logger.error('Min-version check error:', error);
    return null;
  }
}

export async function checkMinimumVersion(): Promise<void> {
  const data = await fetchMinVersion();
  if (!data) return;

  const currentVersion = app.getVersion();

  if (!semver.valid(data.minVersion)) {
    logger.warn(`Server returned invalid minVersion: ${data.minVersion}`);
    return;
  }

  if (semver.lt(currentVersion, data.minVersion)) {
    logger.warn(
      `Current version ${currentVersion} below minimum ${data.minVersion}, forcing update`,
    );
    showForceUpdateDialog(data.minVersion, data.message);
  }
}

function showForceUpdateDialog(minVersion: string, customMessage?: string): void {
  const window = getMainWindow();
  if (!window || window.isDestroyed()) {
    logger.warn('Cannot show force-update dialog without main window');
    app.quit();
    return;
  }

  const result = dialog.showMessageBoxSync(window, {
    type: 'warning',
    title: 'Update erforderlich',
    message: 'Diese Version von Fleet OS wird nicht mehr unterstuetzt.',
    detail:
      customMessage ??
      `Mindestversion: ${minVersion}\nDeine Version: ${app.getVersion()}\n\nBitte aktualisiere Fleet OS, um die App weiter nutzen zu koennen.`,
    buttons: ['Update herunterladen', 'App beenden'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });

  if (result === 0) {
    void shell.openExternal(`${APP_CONFIG.productionUrl}/download`);
  }

  app.quit();
}

export function setupPeriodicMinVersionCheck(): void {
  setTimeout(() => {
    void checkMinimumVersion();
  }, INITIAL_CHECK_DELAY_MS);

  minVersionCheckInterval = setInterval(() => {
    void checkMinimumVersion();
  }, PERIODIC_CHECK_INTERVAL_MS);
}

export function teardownMinVersionCheck(): void {
  if (minVersionCheckInterval) {
    clearInterval(minVersionCheckInterval);
    minVersionCheckInterval = null;
  }
}
