import path from 'path';
import { Tray, Menu, app, nativeImage } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { logger } from '../utils/logger';
import { isMac, isWindows, isLinux } from '../utils/env';
import { getMainWindow, focusMainWindow } from '../window-manager';
import { store } from '../utils/store';
import { APP_CONFIG } from '../../shared/constants';
import { IPC_CHANNELS_TRAY } from '../../shared/ipc-channels-tray';
import type { TrayData } from '../../shared/types';
import { markQuitting } from '../lifecycle';

let tray: Tray | null = null;
let trayData: TrayData = getDefaultTrayData();

function getDefaultTrayData(): TrayData {
  return {
    todayHandovers: 0,
    nextHandover: null,
    openBookings: 0,
    pendingTasks: 0,
    notificationsUnread: 0,
  };
}

function getTrayIconPath(): string {
  // assets/ liegt im electron-builder als extraResource neben dist/.
  // Dev: assets/ relativ zum Repo-Root. Beides via __dirname auflösbar
  // weil tsc nach dist/main/tray/index.js compiliert → ../../../assets.
  const assetsRoot = path.join(__dirname, '..', '..', '..', 'assets', 'tray');
  if (isMac) return path.join(assetsRoot, 'tray-icon-Template.png');
  return path.join(assetsRoot, 'tray-icon-color.png');
}

export function setupTray(): void {
  try {
    const iconPath = getTrayIconPath();
    const icon = nativeImage.createFromPath(iconPath);

    if (icon.isEmpty()) {
      logger.error(`Tray icon not found at ${iconPath}`);
      return;
    }

    if (isMac) {
      icon.setTemplateImage(true);
    }

    tray = new Tray(icon);
    tray.setToolTip(APP_CONFIG.name);

    updateTrayMenu();
    setupTrayClickHandlers();

    // Letzten bekannten State aus Store laden (Cold-Start zeigt zumindest
    // die letzte Snapshot bevor die Webapp neue Daten liefert).
    const cached = store.get('tray.lastData') as TrayData | undefined;
    if (cached) {
      trayData = cached;
      updateTrayMenu();
      updateTrayBadge();
    }

    logger.info('Tray initialized');
  } catch (error) {
    logger.error('Failed to setup tray:', error);
  }
}

function setupTrayClickHandlers(): void {
  if (!tray) return;

  // macOS-Konvention: Linker Click oeffnet das Context-Menu (per `setContextMenu`).
  // Wir wollen aber Click=Toggle und Right-Click=Menu. Dafuer braucht macOS
  // explizites `popUpContextMenu` statt setContextMenu — oder beides.
  tray.on('click', () => {
    if (isMac) {
      // Auf macOS koennte hier ein Toggle ausgeloest werden, oder wir lassen
      // das setContextMenu-Verhalten greifen. Discord/Slack toggle das Window.
      toggleMainWindow();
    } else {
      toggleMainWindow();
    }
  });

  tray.on('double-click', () => {
    focusMainWindow();
  });

  if (isWindows || isLinux) {
    tray.on('right-click', () => {
      tray?.popUpContextMenu();
    });
  }
}

function toggleMainWindow(): void {
  const window = getMainWindow();
  if (!window) return;
  if (window.isVisible() && window.isFocused()) {
    window.hide();
  } else {
    window.show();
    window.focus();
  }
}

export function updateTrayData(data: Partial<TrayData>): void {
  trayData = { ...trayData, ...data };
  updateTrayMenu();
  updateTrayBadge();
  store.set('tray.lastData', trayData);
}

export function getTrayData(): TrayData {
  return trayData;
}

function updateTrayMenu(): void {
  if (!tray) return;
  const menu = Menu.buildFromTemplate(buildMenuTemplate());
  tray.setContextMenu(menu);
}

function buildMenuTemplate(): MenuItemConstructorOptions[] {
  const items: MenuItemConstructorOptions[] = [
    {
      label: 'Fleet OS oeffnen',
      click: () => focusMainWindow(),
    },
    { type: 'separator' },
  ];

  if (trayData.todayHandovers > 0) {
    items.push({
      label: `Heute: ${trayData.todayHandovers} Uebergabe${trayData.todayHandovers > 1 ? 'n' : ''}`,
      enabled: false,
    });

    if (trayData.nextHandover) {
      items.push({
        label: `-> ${trayData.nextHandover.vehicle} - ${trayData.nextHandover.time}`,
        click: () => navigateAndShow('/uebergabe'),
      });
    }

    items.push({ type: 'separator' });
  }

  const statusItems: MenuItemConstructorOptions[] = [];
  if (trayData.openBookings > 0) {
    statusItems.push({
      label: `${trayData.openBookings} offene Buchung${trayData.openBookings > 1 ? 'en' : ''}`,
      click: () => navigateAndShow('/buchungen'),
    });
  }
  if (trayData.pendingTasks > 0) {
    statusItems.push({
      label: `${trayData.pendingTasks} Aufgabe${trayData.pendingTasks > 1 ? 'n' : ''} ausstehend`,
      click: () => navigateAndShow('/aufgaben'),
    });
  }
  if (trayData.notificationsUnread > 0) {
    statusItems.push({
      label: `${trayData.notificationsUnread} ungelesene Nachricht${trayData.notificationsUnread > 1 ? 'en' : ''}`,
      click: () => navigateAndShow('/?notifications=open'),
    });
  }
  if (statusItems.length > 0) {
    items.push(...statusItems, { type: 'separator' });
  }

  items.push(
    {
      label: 'Neue Buchung',
      accelerator: 'CmdOrCtrl+Shift+B',
      click: () => navigateAndShow('/buchungen/neu'),
    },
    {
      label: 'Uebergabe starten',
      accelerator: 'CmdOrCtrl+Shift+U',
      click: () => navigateAndShow('/uebergabe'),
    },
    {
      label: 'Spotlight oeffnen',
      accelerator: 'CmdOrCtrl+Shift+K',
      click: () => {
        focusMainWindow();
        const window = getMainWindow();
        window?.webContents.send(IPC_CHANNELS_TRAY.OPEN_SPOTLIGHT);
      },
    },
    { type: 'separator' },
    {
      label: 'Einstellungen',
      accelerator: isMac ? 'Cmd+,' : undefined,
      click: () => navigateAndShow('/settings'),
    },
    { type: 'separator' },
    {
      label: 'Fleet OS beenden',
      accelerator: 'CmdOrCtrl+Q',
      click: () => {
        markQuitting();
        app.quit();
      },
    },
  );

  return items;
}

function navigateAndShow(targetPath: string): void {
  focusMainWindow();
  const window = getMainWindow();
  window?.webContents.send(IPC_CHANNELS_TRAY.NAVIGATE_TO, targetPath);
}

function updateTrayBadge(): void {
  if (!tray) return;

  if (isMac) {
    // macOS: kurzer Title-Text neben dem Icon
    const total = trayData.todayHandovers + trayData.notificationsUnread;
    tray.setTitle(total > 0 ? ` ${total}` : '');
  }

  const tooltipParts: string[] = [APP_CONFIG.name];
  if (trayData.todayHandovers > 0) {
    tooltipParts.push(`${trayData.todayHandovers} Uebergaben heute`);
  }
  if (trayData.notificationsUnread > 0) {
    tooltipParts.push(`${trayData.notificationsUnread} ungelesen`);
  }
  tray.setToolTip(tooltipParts.join(' - '));
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
    logger.info('Tray destroyed');
  }
}

