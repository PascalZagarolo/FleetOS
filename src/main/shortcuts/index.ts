import { globalShortcut } from 'electron';
import { logger } from '../utils/logger';
import { getMainWindow, focusMainWindow } from '../window-manager';
import { store } from '../utils/store';
import { IPC_CHANNELS_TRAY } from '../../shared/ipc-channels-tray';
import type { ShortcutDefinition } from '../../shared/types';

type InternalShortcut = ShortcutDefinition & {
  action: () => void;
};

const SHORTCUT_DEFINITIONS: InternalShortcut[] = [
  {
    id: 'open-fleet-os',
    accelerator: 'CommandOrControl+Shift+F',
    defaultAccelerator: 'CommandOrControl+Shift+F',
    description: 'Fleet OS oeffnen / fokussieren',
    action: () => focusMainWindow(),
  },
  {
    id: 'new-booking',
    accelerator: 'CommandOrControl+Shift+B',
    defaultAccelerator: 'CommandOrControl+Shift+B',
    description: 'Neue Buchung erstellen',
    action: () => {
      focusMainWindow();
      getMainWindow()?.webContents.send(IPC_CHANNELS_TRAY.NAVIGATE_TO, '/buchungen/neu');
    },
  },
  {
    id: 'start-handover',
    accelerator: 'CommandOrControl+Shift+U',
    defaultAccelerator: 'CommandOrControl+Shift+U',
    description: 'Uebergabe starten',
    action: () => {
      focusMainWindow();
      getMainWindow()?.webContents.send(IPC_CHANNELS_TRAY.NAVIGATE_TO, '/uebergabe');
    },
  },
  {
    id: 'open-spotlight',
    accelerator: 'CommandOrControl+Shift+K',
    defaultAccelerator: 'CommandOrControl+Shift+K',
    description: 'Spotlight oeffnen',
    action: () => {
      focusMainWindow();
      getMainWindow()?.webContents.send(IPC_CHANNELS_TRAY.OPEN_SPOTLIGHT);
    },
  },
];

export function registerGlobalShortcuts(): void {
  const customShortcuts = (store.get('shortcuts.custom') as Record<string, string> | undefined) ?? {};

  for (const shortcut of SHORTCUT_DEFINITIONS) {
    const accelerator = customShortcuts[shortcut.id] ?? shortcut.defaultAccelerator;
    shortcut.accelerator = accelerator;

    try {
      const success = globalShortcut.register(accelerator, () => {
        logger.debug(`Shortcut triggered: ${shortcut.id}`);
        shortcut.action();
      });
      if (success) {
        logger.info(`Registered shortcut: ${shortcut.id} -> ${accelerator}`);
      } else {
        logger.warn(`Failed to register shortcut: ${shortcut.id} -> ${accelerator} (already in use?)`);
      }
    } catch (error) {
      logger.error(`Error registering shortcut ${shortcut.id}:`, error);
    }
  }
}

export function unregisterAllShortcuts(): void {
  globalShortcut.unregisterAll();
  logger.info('All shortcuts unregistered');
}

export function updateShortcut(id: string, newAccelerator: string): boolean {
  const definition = SHORTCUT_DEFINITIONS.find((s) => s.id === id);
  if (!definition) return false;

  globalShortcut.unregister(definition.accelerator);

  try {
    const success = globalShortcut.register(newAccelerator, () => definition.action());
    if (success) {
      const customShortcuts =
        (store.get('shortcuts.custom') as Record<string, string> | undefined) ?? {};
      customShortcuts[id] = newAccelerator;
      store.set('shortcuts.custom', customShortcuts);
      definition.accelerator = newAccelerator;
      logger.info(`Updated shortcut: ${id} -> ${newAccelerator}`);
      return true;
    }
    // Restore old binding
    globalShortcut.register(definition.accelerator, () => definition.action());
    logger.warn(`Failed to update shortcut ${id}, kept ${definition.accelerator}`);
    return false;
  } catch (error) {
    logger.error(`Error updating shortcut ${id}:`, error);
    globalShortcut.register(definition.accelerator, () => definition.action());
    return false;
  }
}

export function resetShortcut(id: string): boolean {
  const definition = SHORTCUT_DEFINITIONS.find((s) => s.id === id);
  if (!definition) return false;

  const ok = updateShortcut(id, definition.defaultAccelerator);
  if (ok) {
    const customShortcuts =
      (store.get('shortcuts.custom') as Record<string, string> | undefined) ?? {};
    delete customShortcuts[id];
    store.set('shortcuts.custom', customShortcuts);
  }
  return ok;
}

export function getShortcutDefinitions(): ShortcutDefinition[] {
  return SHORTCUT_DEFINITIONS.map((s) => ({
    id: s.id,
    accelerator: s.accelerator,
    defaultAccelerator: s.defaultAccelerator,
    description: s.description,
  }));
}
