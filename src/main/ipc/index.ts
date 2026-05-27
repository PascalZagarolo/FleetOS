import { setupAppInfoHandlers } from './app-info';
import { setupWindowControlHandlers } from './window-controls';
import { setupSystemHandlers } from './system';
import { setupUpdaterHandlers } from './updater';
import { setupTrayHandlers } from './tray';
import { setupShortcutHandlers } from './shortcuts';
import { setupPreferencesHandlers } from './preferences';
import { setupAutoStartHandlers } from './auto-start';
import { setupNotificationHandlers } from './notifications';
import { setupWindowsHandlers } from './windows';
import { setupBroadcastHandlers } from './broadcast';
import { setupDocumentHandlers } from './documents';
import { setupConnectivityHandlers } from './connectivity';

export function setupAllIpcHandlers(): void {
  setupAppInfoHandlers();
  setupWindowControlHandlers();
  setupSystemHandlers();
  setupUpdaterHandlers();
  setupTrayHandlers();
  setupShortcutHandlers();
  setupPreferencesHandlers();
  setupAutoStartHandlers();
  setupNotificationHandlers();
  setupWindowsHandlers();
  setupBroadcastHandlers();
  setupDocumentHandlers();
  setupConnectivityHandlers();
}
