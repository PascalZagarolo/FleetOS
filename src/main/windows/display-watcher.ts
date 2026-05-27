import { screen } from 'electron';
import type { Display } from 'electron';
import { logger } from '../utils/logger';
import { windowRegistry } from './registry';
import { broadcastToWindows } from './broadcast';
import { store } from '../utils/store';
import type { SavedWindowState } from '../../shared/window-types';

export function setupDisplayWatcher(): void {
  screen.on('display-added', handleAdded);
  screen.on('display-removed', handleRemoved);
  screen.on('display-metrics-changed', handleMetricsChanged);
  logger.info('Display watcher initialized');
}

export function teardownDisplayWatcher(): void {
  screen.removeAllListeners('display-added');
  screen.removeAllListeners('display-removed');
  screen.removeAllListeners('display-metrics-changed');
}

function handleAdded(_event: unknown, display: Display): void {
  logger.info(`Display added: id=${display.id} (${display.bounds.width}x${display.bounds.height})`);

  // Falls Fenster vorher auf diesem Display waren (lastOpenedAt im Store):
  // versuche sie zurueck zu repositionieren.
  const saved = (store.get('windows.savedStates') as Record<string, SavedWindowState>) ?? {};
  for (const [windowId, state] of Object.entries(saved)) {
    if (state.displayId !== display.id) continue;
    const window = windowRegistry.get(windowId);
    if (!window) continue;
    try {
      logger.info(`Restoring window ${windowId} to reconnected display ${display.id}`);
      window.setBounds(state.bounds);
    } catch (err) {
      logger.warn(`Failed to restore ${windowId} to display ${display.id}:`, err);
    }
  }

  broadcastToWindows({
    type: 'display:added',
    payload: {
      displayId: display.id,
      bounds: display.bounds,
      workArea: display.workArea,
    },
  });
}

function handleRemoved(_event: unknown, display: Display): void {
  logger.info(`Display removed: id=${display.id}`);

  const affected = windowRegistry.getAll().filter((entry) => {
    try {
      const bounds = entry.window.getBounds();
      const current = screen.getDisplayNearestPoint({ x: bounds.x, y: bounds.y });
      return current.id === display.id;
    } catch {
      return false;
    }
  });

  if (affected.length === 0) {
    broadcastToWindows({ type: 'display:removed', payload: { displayId: display.id } });
    return;
  }

  const primary = screen.getPrimaryDisplay();
  for (const entry of affected) {
    try {
      const bounds = entry.window.getBounds();
      const w = Math.min(bounds.width, primary.workArea.width);
      const h = Math.min(bounds.height, primary.workArea.height);
      entry.window.setBounds({
        width: w,
        height: h,
        x: Math.floor(primary.workArea.x + (primary.workArea.width - w) / 2),
        y: Math.floor(primary.workArea.y + (primary.workArea.height - h) / 2),
      });
      logger.info(`Moved window ${entry.config.id} to primary display after disconnect`);
    } catch (err) {
      logger.warn(`Failed to reposition window ${entry.config.id}:`, err);
    }
  }

  broadcastToWindows({ type: 'display:removed', payload: { displayId: display.id } });
}

function handleMetricsChanged(
  _event: unknown,
  display: Display,
  changedMetrics: string[],
): void {
  logger.debug(`Display metrics changed: ${display.id} (${changedMetrics.join(', ')})`);
  broadcastToWindows({
    type: 'display:metrics-changed',
    payload: {
      displayId: display.id,
      bounds: display.bounds,
      workArea: display.workArea,
      changedMetrics,
    },
  });
}
