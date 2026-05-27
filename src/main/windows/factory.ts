import path from 'path';
import { BrowserWindow, screen, shell } from 'electron';
import type { Display } from 'electron';
import { logger } from '../utils/logger';
import { isDevelopment, isMac, isWindows, getAppUrl } from '../utils/env';
import { windowRegistry } from './registry';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { IPC_CHANNELS_WINDOWS } from '../../shared/ipc-channels-windows';
import { ALLOWED_HOSTS } from '../../shared/constants';
import type { WindowConfig } from '../../shared/window-types';
import type { WindowBounds } from '../../shared/types';

export async function createSecondaryWindow(config: WindowConfig): Promise<BrowserWindow> {
  // Unique-Window-Reuse
  if (config.isUnique) {
    const existing = windowRegistry.get(config.id);
    if (existing) {
      existing.show();
      existing.focus();
      return existing;
    }
  }

  const savedState = windowRegistry.loadState(config.id);
  const requestedBounds = pickBounds(config, savedState?.bounds);
  const bounds = validateBounds(requestedBounds, savedState?.displayId);

  const preloadPath = path.join(__dirname, '..', '..', 'preload', 'index.js');

  const window = new BrowserWindow({
    ...bounds,
    minWidth: config.minBounds.width,
    minHeight: config.minBounds.height,
    maxWidth: config.maxBounds?.width,
    maxHeight: config.maxBounds?.height,

    title: config.title,
    backgroundColor: '#0F0F0F',
    show: false,

    frame: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    titleBarOverlay: isWindows
      ? {
          color: '#0F0F0F',
          symbolColor: '#F1EFE8',
          height: 40,
        }
      : undefined,

    resizable: config.resizable,
    closable: config.closable,
    minimizable: config.minimizable,
    maximizable: config.maximizable,
    alwaysOnTop: config.alwaysOnTop,

    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      backgroundThrottling: false,
    },

    icon: path.join(__dirname, '..', '..', '..', 'assets', 'icons', 'icon.png'),
  });

  if (savedState?.isMaximized) window.maximize();
  if (savedState?.isFullScreen) window.setFullScreen(true);

  const url = buildUrl(config);
  logger.info(`Loading URL for window ${config.id}: ${url}`);
  try {
    await window.loadURL(url);
  } catch (error) {
    logger.error(`Failed to load URL for window ${config.id}`, error);
  }

  window.once('ready-to-show', () => {
    window.show();
    if (config.type !== 'tool') {
      window.focus();
    }
    if (isDevelopment) {
      window.webContents.openDevTools({ mode: 'detach' });
    }
  });

  setupSecondaryWindowEvents(window, config);
  setupExternalLinkHandler(window);

  windowRegistry.register(config.id, window, config);
  return window;
}

function buildUrl(config: WindowConfig): string {
  const base = getAppUrl();
  const url = new URL(config.url, base);
  url.searchParams.set('window_id', config.id);
  url.searchParams.set('window_type', config.type);
  if (config.appId) url.searchParams.set('window_app', config.appId);
  if (config.detailType) url.searchParams.set('detail_type', config.detailType);
  if (config.detailId) url.searchParams.set('detail_id', config.detailId);
  return url.toString();
}

function pickBounds(config: WindowConfig, savedBounds: WindowBounds | undefined): WindowBounds {
  if (savedBounds) return savedBounds;

  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;
  const existing = windowRegistry.count();
  const cascadeOffset = (existing % 5) * 30;

  return {
    width: config.defaultBounds.width,
    height: config.defaultBounds.height,
    x:
      Math.floor(workArea.x + (workArea.width - config.defaultBounds.width) / 2) +
      cascadeOffset,
    y:
      Math.floor(workArea.y + (workArea.height - config.defaultBounds.height) / 2) +
      cascadeOffset,
  };
}

function validateBounds(bounds: WindowBounds, preferredDisplayId?: number): WindowBounds {
  const displays = screen.getAllDisplays();

  if (preferredDisplayId !== undefined) {
    const display = displays.find((d) => d.id === preferredDisplayId);
    if (display) {
      if (fitsInDisplay(bounds, display)) return bounds;
      return repositionInDisplay(bounds, display);
    }
  }

  for (const display of displays) {
    if (fitsInDisplay(bounds, display)) return bounds;
  }

  return repositionInDisplay(bounds, screen.getPrimaryDisplay());
}

function fitsInDisplay(bounds: WindowBounds, display: Display): boolean {
  if (bounds.x === undefined || bounds.y === undefined) return false;
  const { x, y, width, height } = display.workArea;
  return (
    bounds.x >= x &&
    bounds.y >= y &&
    bounds.x + bounds.width <= x + width &&
    bounds.y + bounds.height <= y + height
  );
}

function repositionInDisplay(bounds: WindowBounds, display: Display): WindowBounds {
  const { x, y, width, height } = display.workArea;
  const w = Math.min(bounds.width, width);
  const h = Math.min(bounds.height, height);
  return {
    width: w,
    height: h,
    x: Math.floor(x + (width - w) / 2),
    y: Math.floor(y + (height - h) / 2),
  };
}

function setupSecondaryWindowEvents(window: BrowserWindow, config: WindowConfig): void {
  let saveBoundsTimer: ReturnType<typeof setTimeout> | null = null;
  const saveBounds = () => {
    if (saveBoundsTimer) clearTimeout(saveBoundsTimer);
    saveBoundsTimer = setTimeout(() => {
      if (!window.isMaximized() && !window.isMinimized() && !window.isFullScreen()) {
        windowRegistry.saveState(config.id);
      }
    }, 500);
  };

  window.on('resize', saveBounds);
  window.on('move', saveBounds);

  window.on('maximize', () => {
    windowRegistry.saveState(config.id);
    window.webContents.send(IPC_CHANNELS.WINDOW_MAXIMIZED);
  });

  window.on('unmaximize', () => {
    windowRegistry.saveState(config.id);
    window.webContents.send(IPC_CHANNELS.WINDOW_UNMAXIMIZED);
  });

  window.on('focus', () => window.webContents.send(IPC_CHANNELS.WINDOW_FOCUSED));
  window.on('blur', () => window.webContents.send(IPC_CHANNELS.WINDOW_BLURRED));
  window.on('enter-full-screen', () =>
    window.webContents.send(IPC_CHANNELS.WINDOW_FULLSCREEN_ENTER),
  );
  window.on('leave-full-screen', () =>
    window.webContents.send(IPC_CHANNELS.WINDOW_FULLSCREEN_LEAVE),
  );

  // Display-Change-Tracking pro Window
  window.on('move', () => {
    try {
      const bounds = window.getBounds();
      const display = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
      window.webContents.send(IPC_CHANNELS_WINDOWS.DISPLAY_CHANGED, {
        displayId: display.id,
        displayBounds: display.bounds,
      });
    } catch {
      // Display gone — display-watcher uebernimmt
    }
  });
}

function setupExternalLinkHandler(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (!isInternalUrl(url)) {
      void shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (!isInternalUrl(url)) {
      event.preventDefault();
      void shell.openExternal(url);
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
