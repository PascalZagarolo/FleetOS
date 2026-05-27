import path from 'path';
import { app, BrowserWindow } from 'electron';
import { createMainWindow, focusMainWindow } from './window-manager';
import { setupAllIpcHandlers } from './ipc';
import { setupApplicationMenu } from './menu/application-menu';
import { isDevelopment, isMac } from './utils/env';
import { logger } from './utils/logger';
import { store } from './utils/store';
import { APP_CONFIG, ALLOWED_HOSTS } from '../shared/constants';
import { setupAutoUpdater, teardownAutoUpdater } from './updater';
import {
  setupPeriodicMinVersionCheck,
  teardownMinVersionCheck,
} from './updater/force-update';
import { setupTray, destroyTray } from './tray';
import { registerGlobalShortcuts, unregisterAllShortcuts } from './shortcuts';
import {
  setupDeepLinks,
  handleDeepLinkFromArgv,
  flushPendingDeepLink,
} from './deep-links';
import { setupDisplayWatcher, teardownDisplayWatcher } from './windows/display-watcher';
import { windowRegistry } from './windows/registry';
import {
  startConnectivityWatcher,
  stopConnectivityWatcher,
} from './sync/connectivity';
import { markQuitting } from './lifecycle';

logger.info(`Starting ${APP_CONFIG.name}`);
logger.info(`Version: ${app.getVersion()}`);
logger.info(`Electron: ${process.versions.electron}`);
logger.info(`Platform: ${process.platform} ${process.arch}`);
logger.info(`Development: ${isDevelopment}`);

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  logger.info('Another instance is running, quitting');
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    logger.info('Second instance attempted to start');
    focusMainWindow();
    handleDeepLinkFromArgv(commandLine);
  });

  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(APP_CONFIG.protocol, process.execPath, [
        path.resolve(process.argv[1]),
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient(APP_CONFIG.protocol);
  }

  // open-url + argv-Handling kommt aus dem deep-links Modul
  setupDeepLinks();

  app.whenReady().then(async () => {
    logger.info('App ready, setting up');

    // Google's OAuth policy rejects embedded-webview clients, and detects
    // "Electron/x.y.z" in the User-Agent. Strip the Electron token (and the
    // product token Electron auto-derives from package.json) so Google sees
    // a regular Chromium UA. The webapp identifies Fleet OS via
    // window.electron (preload-exposed), not via UA, so nothing else cares.
    const originalUA = app.userAgentFallback;
    app.userAgentFallback = originalUA
      .replace(/\sElectron\/\S+/g, '')
      .replace(/\sFleet OS\/\S+/g, '');
    logger.info(`UA override: "${originalUA}" -> "${app.userAgentFallback}"`);

    const lastVersion = store.get('app.lastVersion');
    const currentVersion = app.getVersion();
    if (lastVersion !== currentVersion) {
      logger.info(`Version changed from ${lastVersion} to ${currentVersion}`);
      store.set('app.lastVersion', currentVersion);
    }

    setupAllIpcHandlers();
    setupApplicationMenu();
    await createMainWindow();

    setupAutoUpdater();
    setupPeriodicMinVersionCheck();
    setupTray();
    registerGlobalShortcuts();
    setupDisplayWatcher();
    startConnectivityWatcher();

    // Cold-Start deep-link aus process.argv (Windows/Linux)
    handleDeepLinkFromArgv(process.argv);
    // Falls Deep-Link vor Window-Ready ankam: jetzt nachholen
    flushPendingDeepLink();

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createMainWindow();
      } else {
        focusMainWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

app.on('before-quit', () => {
  markQuitting();
  windowRegistry.saveAllStates();
  teardownAutoUpdater();
  teardownMinVersionCheck();
  teardownDisplayWatcher();
  stopConnectivityWatcher();
  unregisterAllShortcuts();
  destroyTray();
  logger.info('App quitting');
});

app.on('will-quit', () => {
  // Sicherheits-Cleanup falls before-quit nicht greift (z.B. force-quit)
  unregisterAllShortcuts();
});

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      const hostname = parsedUrl.hostname as (typeof ALLOWED_HOSTS)[number];
      if (!ALLOWED_HOSTS.includes(hostname)) {
        event.preventDefault();
        logger.warn(`Blocked navigation to ${navigationUrl}`);
      }
    } catch {
      event.preventDefault();
    }
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});
