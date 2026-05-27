import path from 'path';
import { Notification } from 'electron';
import type { NotificationConstructorOptions } from 'electron';
import { logger } from '../utils/logger';
import { isMac } from '../utils/env';
import { getMainWindow, focusMainWindow } from '../window-manager';
import { store } from '../utils/store';
import { IPC_CHANNELS_NOTIFICATIONS } from '../../shared/ipc-channels-tray';
import { IPC_CHANNELS_TRAY } from '../../shared/ipc-channels-tray';
import type {
  RichNotificationOptions,
  NotificationPermissionState,
  DndSettings,
} from '../../shared/types';

// Aktive Notifications, gemappt nach Tag — fuer Tag-Replacement.
const activeByTag = new Map<string, Notification>();

export function showRichNotification(options: RichNotificationOptions): void {
  if (!Notification.isSupported()) {
    logger.warn('Notifications not supported on this platform');
    return;
  }

  if (isDoNotDisturbActive()) {
    logger.debug(`Notification suppressed (DnD): ${options.title}`);
    return;
  }

  if (options.category && !isCategoryEnabled(options.category)) {
    logger.debug(`Notification suppressed (category "${options.category}" disabled): ${options.title}`);
    return;
  }

  // Tag-Replacement: gleicher Tag => alte schliessen
  if (options.tag) {
    const existing = activeByTag.get(options.tag);
    if (existing) {
      try {
        existing.close();
      } catch {
        // ignore
      }
      activeByTag.delete(options.tag);
    }
  }

  const nativeOpts: NotificationConstructorOptions = {
    title: options.title,
    body: options.body,
    subtitle: options.subtitle,
    icon: options.icon ? resolveIconPath(options.icon) : undefined,
    silent: options.silent ?? !options.urgent,
    urgency: options.urgent ? 'critical' : 'normal',
    timeoutType: options.urgent ? 'never' : 'default',
    actions: options.actions?.map((a) => ({
      type: 'button' as const,
      text: a.text,
    })),
    hasReply: isMac && options.hasReply,
    replyPlaceholder: options.replyPlaceholder,
  };

  const notif = new Notification(nativeOpts);

  notif.on('click', () => {
    logger.debug(`Notification clicked: ${options.title}`);
    focusMainWindow();
    const window = getMainWindow();
    if (options.navigateTo && window) {
      window.webContents.send(IPC_CHANNELS_TRAY.NAVIGATE_TO, options.navigateTo);
    }
    window?.webContents.send(IPC_CHANNELS_NOTIFICATIONS.CLICKED, {
      id: options.id,
      data: options.data,
    });
  });

  notif.on('action', (_event, index) => {
    const action = options.actions?.[index];
    if (!action) return;
    logger.debug(`Notification action: ${action.action}`);
    getMainWindow()?.webContents.send(IPC_CHANNELS_NOTIFICATIONS.ACTION, {
      id: options.id,
      action: action.action,
      data: options.data,
    });
  });

  notif.on('reply', (_event, reply) => {
    logger.debug(`Notification reply received (length=${reply.length})`);
    getMainWindow()?.webContents.send(IPC_CHANNELS_NOTIFICATIONS.REPLY, {
      id: options.id,
      reply,
      data: options.data,
    });
  });

  notif.on('close', () => {
    if (options.tag) {
      activeByTag.delete(options.tag);
    }
  });

  notif.show();
  if (options.tag) {
    activeByTag.set(options.tag, notif);
  }
  logger.info(`Notification shown: ${options.title}`);
}

function isDoNotDisturbActive(): boolean {
  const dnd = store.get('notifications.dnd') as DndSettings | undefined;
  if (!dnd || !dnd.enabled || !dnd.from || !dnd.to) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [fromH, fromM] = dnd.from.split(':').map(Number);
  const [toH, toM] = dnd.to.split(':').map(Number);
  if (Number.isNaN(fromH) || Number.isNaN(toH)) return false;

  const fromMinutes = fromH * 60 + fromM;
  const toMinutes = toH * 60 + toM;

  // Wrap-around (z.B. 22:00 - 07:00)
  if (fromMinutes > toMinutes) {
    return currentMinutes >= fromMinutes || currentMinutes < toMinutes;
  }
  return currentMinutes >= fromMinutes && currentMinutes < toMinutes;
}

function isCategoryEnabled(category: string): boolean {
  const prefs = store.get('notifications.preferences') as Record<string, boolean> | undefined;
  if (!prefs) return true;
  return prefs[category] !== false;
}

function resolveIconPath(icon: string): string {
  if (icon.startsWith('http')) return icon;
  if (icon.startsWith('/') || icon.match(/^[a-zA-Z]:[\\/]/)) return icon;
  return path.join(__dirname, '..', '..', '..', 'assets', 'icons', icon);
}

export function getNotificationPermissionStatus(): NotificationPermissionState {
  if (!Notification.isSupported()) return 'unsupported';

  // Electron hat keine echte Permission-API. Wir tracken den State im Store
  // basierend darauf was der User in Settings tut + macOS-Side-Effects.
  const granted = store.get('notifications.permissionGranted') as boolean | undefined;
  if (granted === true) return 'granted';
  if (granted === false) return 'denied';
  return 'default';
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!Notification.isSupported()) return 'unsupported';

  // macOS triggert die OS-Permission-Sheet beim ersten Show. Wir feuern eine
  // dezente Test-Notification, der User sieht den macOS-Dialog und entscheidet.
  // Status zurueck-mappen ist auf macOS nicht trivial (keine API dafuer) —
  // wir setzen optimistisch auf 'granted', der echte Status zeigt sich in
  // der Praxis durch ankommende Notifications.
  try {
    if (isMac) {
      const probe = new Notification({
        title: 'Fleet OS Benachrichtigungen',
        body: 'Bitte erlaube Fleet OS, dir Benachrichtigungen zu schicken.',
        silent: true,
      });
      probe.show();
    }

    store.set('notifications.permissionGranted', true);
    store.set('notifications.permissionRequestedAt', Date.now());
    return 'granted';
  } catch (error) {
    logger.error('Failed to request notification permission:', error);
    store.set('notifications.permissionGranted', false);
    return 'denied';
  }
}

export function getNotificationPreferences(): {
  preferences: Record<string, boolean>;
  dnd: DndSettings;
} {
  return {
    preferences: (store.get('notifications.preferences') as Record<string, boolean>) ?? {},
    dnd: (store.get('notifications.dnd') as DndSettings) ?? { enabled: false },
  };
}

export function setNotificationPreferences(prefs: Record<string, boolean>): void {
  store.set('notifications.preferences', prefs);
}

export function setDndSettings(dnd: DndSettings): void {
  store.set('notifications.dnd', dnd);
}
