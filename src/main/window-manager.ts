import path from 'path';
import { BrowserWindow, Notification, app, shell, screen } from 'electron';
import { store } from './utils/store';
import { getAppUrl, isDevelopment, isMac, isWindows } from './utils/env';
import { logger } from './utils/logger';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import { APP_CONFIG, ALLOWED_HOSTS } from '../shared/constants';
import type { WindowBounds } from '../shared/types';
import { wasAppOpenedByAutoStart } from './auto-start';
import { windowRegistry } from './windows/registry';
import type { WindowConfig } from '../shared/window-types';
import { isQuitting } from './lifecycle';

let mainWindow: BrowserWindow | null = null;

export async function createMainWindow(): Promise<BrowserWindow> {
  logger.info('Creating main window');

  const savedBounds = getValidatedBounds(store.get('window.bounds'));
  const wasMaximized = store.get('window.maximized');

  const preloadPath = path.join(__dirname, '../preload/index.js');

  mainWindow = new BrowserWindow({
    ...savedBounds,
    minWidth: APP_CONFIG.minWindowBounds.width,
    minHeight: APP_CONFIG.minWindowBounds.height,

    title: APP_CONFIG.name,
    backgroundColor: '#0F0F0F',

    show: false,

    // Frameless: required on Windows for the native title bar to fully
    // disappear. titleBarStyle: 'hidden' alone leaves a thin strip.
    frame: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    titleBarOverlay: isWindows
      ? {
          // Must match the AppTitleBar background painted by the webapp at
          // components/electron/app-title-bar.tsx — both are #0F0F0F so the
          // Windows-drawn min/max/close buttons sit on the same surface as
          // the custom chrome. The wider Fleet OS shell is dark-themed
          // (zinc-900 sidebar, ink-900 body), a cream strip up top would
          // visually fracture the workspace.
          color: '#0F0F0F',
          symbolColor: '#F1EFE8',
          height: 40,
        }
      : undefined,

    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      backgroundThrottling: false,
    },

    icon: path.join(__dirname, '../../assets/icons/icon.png'),
  });

  if (wasMaximized) {
    mainWindow.maximize();
  }

  // Windows would otherwise pop up the menu bar on Alt-press even after
  // setApplicationMenu(null). These two calls suppress that completely.
  if (!isMac) {
    mainWindow.setMenuBarVisibility(false);
    mainWindow.setAutoHideMenuBar(true);
  }

  const url = getAppUrl();
  logger.info(`Loading URL: ${url}`);

  try {
    await mainWindow.loadURL(url);
  } catch (error) {
    logger.error('Failed to load URL', error);
    await showLoadError(mainWindow, url);
  }

  const startedHidden = wasAppOpenedByAutoStart();

  mainWindow.once('ready-to-show', () => {
    if (!startedHidden) {
      mainWindow?.show();
      mainWindow?.focus();
    } else {
      logger.info('Started hidden via auto-start, window stays invisible until tray click');
    }
    if (isDevelopment) {
      mainWindow?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  setupWindowEvents(mainWindow);
  setupExternalLinkHandler(mainWindow);

  // In die Multi-Window-Registry einklinken, damit das Hauptfenster ueber
  // die windows-API (focus/list/getCurrentInfo) genauso adressierbar ist
  // wie sekundaere Fenster. Die existierende Bounds-Persistierung in
  // 'window.bounds' bleibt parallel aktiv — die Registry-Persistierung
  // unter windows.savedStates['main'] ist additiv.
  const mainConfig: WindowConfig = {
    id: 'main',
    type: 'main',
    url: '/',
    title: APP_CONFIG.name,
    defaultBounds: APP_CONFIG.defaultWindowBounds,
    minBounds: APP_CONFIG.minWindowBounds,
    resizable: true,
    closable: true,
    minimizable: true,
    maximizable: true,
    isUnique: true,
  };
  windowRegistry.register('main', mainWindow, mainConfig);

  return mainWindow;
}

function getValidatedBounds(saved: unknown): WindowBounds {
  const defaults = APP_CONFIG.defaultWindowBounds;

  if (!saved || typeof saved !== 'object') return defaults;
  const b = saved as Partial<WindowBounds>;

  const width =
    typeof b.width === 'number' && b.width >= APP_CONFIG.minWindowBounds.width
      ? b.width
      : defaults.width;
  const height =
    typeof b.height === 'number' && b.height >= APP_CONFIG.minWindowBounds.height
      ? b.height
      : defaults.height;

  if (typeof b.x === 'number' && typeof b.y === 'number') {
    const displays = screen.getAllDisplays();
    const isVisible = displays.some((display) => {
      const { x, y, width: w, height: h } = display.bounds;
      return b.x! >= x && b.x! < x + w && b.y! >= y && b.y! < y + h;
    });
    if (isVisible) {
      return { width, height, x: b.x, y: b.y };
    }
  }

  return { width, height };
}

function setupWindowEvents(window: BrowserWindow): void {
  let saveBoundsTimer: NodeJS.Timeout | null = null;
  const saveBounds = () => {
    if (saveBoundsTimer) clearTimeout(saveBoundsTimer);
    saveBoundsTimer = setTimeout(() => {
      if (!window.isMaximized() && !window.isMinimized()) {
        store.set('window.bounds', window.getBounds());
      }
    }, 500);
  };

  window.on('resize', saveBounds);
  window.on('move', saveBounds);

  window.on('maximize', () => {
    store.set('window.maximized', true);
    window.webContents.send(IPC_CHANNELS.WINDOW_MAXIMIZED);
  });

  window.on('unmaximize', () => {
    store.set('window.maximized', false);
    window.webContents.send(IPC_CHANNELS.WINDOW_UNMAXIMIZED);
  });

  window.on('focus', () => {
    window.webContents.send(IPC_CHANNELS.WINDOW_FOCUSED);
  });

  window.on('blur', () => {
    window.webContents.send(IPC_CHANNELS.WINDOW_BLURRED);
  });

  window.on('enter-full-screen', () => {
    window.webContents.send(IPC_CHANNELS.WINDOW_FULLSCREEN_ENTER);
  });

  window.on('leave-full-screen', () => {
    window.webContents.send(IPC_CHANNELS.WINDOW_FULLSCREEN_LEAVE);
  });

  window.on('close', (event) => {
    // Echter Quit (Tray-"Beenden", Cmd+Q, before-quit fired): durchlassen.
    if (isQuitting()) return;

    // Setting deaktiviert: normales Close-Verhalten.
    const minimizeToTray = store.get('preferences.minimizeToTray');
    if (!minimizeToTray) return;

    event.preventDefault();
    window.hide();

    // First-Time-Hint, damit User nicht denkt die App ist weg.
    const hintShown = store.get('tray.minimizeHintShown') as boolean | undefined;
    if (!hintShown) {
      showMinimizeHint();
      store.set('tray.minimizeHintShown', true);
    }
  });

  window.on('closed', () => {
    mainWindow = null;
  });
}

function showMinimizeHint(): void {
  if (!Notification.isSupported()) return;
  try {
    new Notification({
      title: 'Fleet OS laeuft im Hintergrund',
      body: 'Klick aufs Tray-Icon holt das Fenster zurueck. Beenden ueber das Tray-Menue.',
      silent: true,
    }).show();
  } catch (err) {
    logger.warn('Could not show minimize hint:', err);
  }
}

function setupExternalLinkHandler(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (!isInternalUrl(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (!isInternalUrl(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

function isInternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_HOSTS.includes(parsed.hostname as (typeof ALLOWED_HOSTS)[number]);
  } catch {
    return false;
  }
}

async function showLoadError(window: BrowserWindow, url: string): Promise<void> {
  const errorHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Fleet OS - Verbindungsfehler</title>
<style>
  :root { color-scheme: dark; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: #0F0F0F; color: #F1EFE8;
    margin: 0; padding: 40px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 100vh; text-align: center;
  }
  h1 { font-size: 16px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 12px; }
  p { font-size: 13px; color: #a8a29e; margin: 4px 0; }
  .url { font-size: 11px; color: #57534e; margin-top: 16px; font-family: ui-monospace, monospace; }
  button {
    margin-top: 24px; padding: 8px 16px;
    background: #3730a3; color: #F1EFE8; border: none;
    font-family: inherit; font-size: 11px; font-weight: 500;
    letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer;
  }
  button:hover { background: #312e81; }
</style></head>
<body>
  <h1>Verbindungsfehler</h1>
  <p>Fleet OS konnte nicht erreicht werden.</p>
  <p>Bitte pruefe deine Internetverbindung.</p>
  <p class="url">${escapeHtml(url)}</p>
  <button onclick="retry()">Erneut versuchen</button>
  <script>
    // location.reload() wuerde die data: URL der Error-Page neu laden —
    // die ist im Navigation-Guard geblockt. Stattdessen explizit zur
    // urspruenglichen Target-URL navigieren.
    var TARGET_URL = ${JSON.stringify(url)};
    function retry() { window.location.href = TARGET_URL; }
  </script>
</body></html>`;

  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function focusMainWindow(): void {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}
