import { screen, type BrowserWindow } from 'electron';
import { logger } from '../utils/logger';
import { store } from '../utils/store';
import { IPC_CHANNELS_WINDOWS } from '../../shared/ipc-channels-windows';
import type {
  WindowConfig,
  SavedWindowState,
  WindowInfo,
} from '../../shared/window-types';

interface RegistryEntry {
  window: BrowserWindow;
  config: WindowConfig;
  createdAt: number;
}

class WindowRegistry {
  private windows = new Map<string, RegistryEntry>();

  register(id: string, window: BrowserWindow, config: WindowConfig): void {
    const existing = this.windows.get(id);
    if (existing) {
      logger.warn(`Window with ID ${id} already registered, replacing`);
      this.windows.delete(id);
    }

    this.windows.set(id, { window, config, createdAt: Date.now() });
    logger.info(`Window registered: ${id} (${config.type})`);

    window.on('closed', () => {
      this.unregister(id);
    });

    this.broadcastListChanged();
  }

  unregister(id: string): void {
    const entry = this.windows.get(id);
    if (!entry) return;
    this.saveState(id);
    this.windows.delete(id);
    logger.info(`Window unregistered: ${id}`);
    this.broadcastListChanged();
  }

  get(id: string): BrowserWindow | null {
    const entry = this.windows.get(id);
    if (!entry || entry.window.isDestroyed()) return null;
    return entry.window;
  }

  getConfig(id: string): WindowConfig | null {
    return this.windows.get(id)?.config ?? null;
  }

  getAll(): RegistryEntry[] {
    return Array.from(this.windows.values()).filter((e) => !e.window.isDestroyed());
  }

  getByAppId(appId: string): RegistryEntry | null {
    return this.getAll().find((e) => e.config.appId === appId) ?? null;
  }

  getByDetail(detailType: string, detailId: string): RegistryEntry | null {
    return (
      this.getAll().find(
        (e) => e.config.detailType === detailType && e.config.detailId === detailId,
      ) ?? null
    );
  }

  findByBrowserWindow(window: BrowserWindow): RegistryEntry | null {
    for (const entry of this.windows.values()) {
      if (entry.window === window) return entry;
    }
    return null;
  }

  exists(id: string): boolean {
    return this.windows.has(id);
  }

  count(): number {
    return this.getAll().length;
  }

  list(): WindowInfo[] {
    return this.getAll().map((entry) => ({
      id: entry.config.id,
      type: entry.config.type,
      appId: entry.config.appId,
      detailType: entry.config.detailType,
      detailId: entry.config.detailId,
      title: entry.config.title,
      isFocused: entry.window.isFocused(),
    }));
  }

  saveState(id: string): void {
    const entry = this.windows.get(id);
    if (!entry || entry.window.isDestroyed()) return;

    let displayId: number | undefined;
    try {
      const bounds = entry.window.getBounds();
      displayId = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y }).id;
    } catch {
      // headless oder display gone
    }

    const state: SavedWindowState = {
      id,
      config: entry.config,
      bounds: entry.window.getBounds(),
      isMaximized: entry.window.isMaximized(),
      isFullScreen: entry.window.isFullScreen(),
      displayId,
      lastOpenedAt: Date.now(),
    };

    const all = (store.get('windows.savedStates') as Record<string, SavedWindowState>) ?? {};
    all[id] = state;
    store.set('windows.savedStates', all);
  }

  saveAllStates(): void {
    for (const id of this.windows.keys()) {
      this.saveState(id);
    }
  }

  loadState(id: string): SavedWindowState | null {
    const all = (store.get('windows.savedStates') as Record<string, SavedWindowState>) ?? {};
    return all[id] ?? null;
  }

  closeAll(): void {
    for (const entry of this.getAll()) {
      try {
        entry.window.close();
      } catch (err) {
        logger.warn(`Failed to close window ${entry.config.id}:`, err);
      }
    }
    this.windows.clear();
  }

  private broadcastListChanged(): void {
    const list = this.list();
    for (const entry of this.getAll()) {
      try {
        entry.window.webContents.send(IPC_CHANNELS_WINDOWS.WINDOW_LIST_CHANGED, list);
      } catch {
        // Webcontents weg
      }
    }
  }
}

export const windowRegistry = new WindowRegistry();
