import { app, nativeImage } from 'electron';
import { getMainWindow } from './window-manager';
import { isWindows } from './utils/env';
import { logger } from './utils/logger';
import type { BadgePayload } from '../shared/types';

/**
 * OS-level badge for the taskbar (Windows) / dock (macOS) / Unity launcher
 * (Linux). Fed from the webapp's fleet-status poller via IPC.
 *
 * Platform split (see Electron docs):
 *   - macOS / Linux-Unity: `app.setBadgeCount(n)` draws a native numeric badge
 *     on the dock/launcher icon. No image needed.
 *   - Windows: there is NO native numeric taskbar badge. `setBadgeCount` is a
 *     no-op. Instead we paint a 16×16 overlay icon on the taskbar button via
 *     `win.setOverlayIcon`. The renderer (which has a canvas) pre-renders the
 *     number into a PNG data URL and ships it here.
 */
export function setAppBadge({ count, overlayDataUrl }: BadgePayload): void {
  try {
    // macOS dock + Linux Unity. Returns false / no-ops on Windows — harmless.
    app.setBadgeCount(count > 0 ? count : 0);

    if (isWindows) {
      const win = getMainWindow();
      if (!win || win.isDestroyed()) return;

      if (count > 0 && overlayDataUrl) {
        const overlay = nativeImage.createFromDataURL(overlayDataUrl);
        if (!overlay.isEmpty()) {
          win.setOverlayIcon(overlay, `${count} offene Vorgänge`);
        }
      } else {
        win.setOverlayIcon(null, '');
      }
    }
  } catch (error) {
    logger.warn('Failed to set app badge:', error);
  }
}
