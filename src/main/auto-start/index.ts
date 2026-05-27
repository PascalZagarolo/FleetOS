import { app } from 'electron';
import { logger } from '../utils/logger';
import { store } from '../utils/store';
import { isMac, isWindows } from '../utils/env';

const HIDDEN_FLAG = '--hidden';

export function setAutoStart(enabled: boolean): void {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true,
      args: enabled ? [HIDDEN_FLAG] : [],
    });
    store.set('preferences.autoStart', enabled);
    logger.info(`Auto-start ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    logger.error('Failed to set auto-start:', error);
  }
}

export function isAutoStartEnabled(): boolean {
  try {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  } catch (error) {
    logger.error('Failed to get auto-start status:', error);
    return false;
  }
}

// Wird vom window-manager genutzt: wenn true, startet das Window nicht
// sichtbar, sondern bleibt im Tray bis der User klickt.
export function wasAppOpenedByAutoStart(): boolean {
  if (isMac) {
    try {
      return app.getLoginItemSettings().wasOpenedAtLogin;
    } catch {
      return false;
    }
  }
  if (isWindows) {
    return process.argv.includes(HIDDEN_FLAG);
  }
  // Linux: Auto-Start ist Distro-spezifisch (XDG-Autostart), wir treffen
  // hier keine spezielle Annahme.
  return false;
}
