import { logger } from '../utils/logger';
import { createSecondaryWindow } from './factory';
import { windowRegistry } from './registry';
import {
  APP_WINDOW_PRESETS,
  DETAIL_URL_BUILDERS,
  DEFAULT_DETAIL_TITLE,
} from '../../shared/window-presets';
import type { AppWindowId, WindowConfig, WindowInfo } from '../../shared/window-types';

export async function openAppWindow(appId: AppWindowId): Promise<string> {
  const preset = APP_WINDOW_PRESETS[appId];
  if (!preset) {
    throw new Error(`Unknown app window id: ${appId}`);
  }

  const existing = windowRegistry.getByAppId(appId);
  if (existing) {
    existing.window.show();
    existing.window.focus();
    return existing.config.id;
  }

  const id = `app-${appId}`;
  const config: WindowConfig = { ...preset, id, type: 'app', appId };
  await createSecondaryWindow(config);
  return id;
}

// Open any Fleet OS dashboard tab in its own window. The webapp's op-layout
// reads `?tab=` from the URL and initializes currentTab from it (see
// app/dashboard/[userId]/_components/op-layout.tsx around line 267).
export async function openTabWindow(tabId: string, userId: string): Promise<string> {
  const id = `tab-${tabId}`;
  const existing = windowRegistry.get(id);
  if (existing) {
    if (existing.isMinimized()) existing.restore();
    existing.show();
    existing.focus();
    return id;
  }

  const config: WindowConfig = {
    id,
    type: 'app',
    url: `/dashboard/${encodeURIComponent(userId)}?tab=${encodeURIComponent(tabId)}`,
    title: `${humanizeTabId(tabId)} | Fleet OS`,
    defaultBounds: { width: 1280, height: 820 },
    minBounds: { width: 900, height: 600 },
    resizable: true,
    closable: true,
    minimizable: true,
    maximizable: true,
    isUnique: true,
  };
  await createSecondaryWindow(config);
  return id;
}

function humanizeTabId(id: string): string {
  return id
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface OpenDetailOptions {
  title?: string;
  bounds?: { width: number; height: number };
}

export async function openDetailWindow(
  detailType: string,
  detailId: string,
  options: OpenDetailOptions = {},
): Promise<string> {
  const existing = windowRegistry.getByDetail(detailType, detailId);
  if (existing) {
    existing.window.show();
    existing.window.focus();
    return existing.config.id;
  }

  const urlBuilder = DETAIL_URL_BUILDERS[detailType];
  if (!urlBuilder) {
    throw new Error(`Unknown detail type: ${detailType}`);
  }

  const id = `detail-${detailType}-${detailId}`;
  const title =
    options.title ?? `${DEFAULT_DETAIL_TITLE[detailType] ?? detailType} | Fleet OS`;

  const config: WindowConfig = {
    id,
    type: 'detail',
    detailType,
    detailId,
    url: urlBuilder(detailId),
    title,
    defaultBounds: {
      width: options.bounds?.width ?? 900,
      height: options.bounds?.height ?? 700,
    },
    minBounds: { width: 600, height: 500 },
    resizable: true,
    closable: true,
    minimizable: true,
    maximizable: true,
  };

  await createSecondaryWindow(config);
  return id;
}

export interface OpenToolOptions {
  url: string;
  title: string;
  bounds: { width: number; height: number };
  alwaysOnTop?: boolean;
}

export async function openToolWindow(toolId: string, options: OpenToolOptions): Promise<string> {
  const id = `tool-${toolId}`;
  const existing = windowRegistry.get(id);
  if (existing) {
    existing.show();
    existing.focus();
    return id;
  }

  const config: WindowConfig = {
    id,
    type: 'tool',
    url: options.url,
    title: options.title,
    defaultBounds: options.bounds,
    minBounds: { width: 400, height: 300 },
    resizable: true,
    closable: true,
    minimizable: true,
    maximizable: false,
    alwaysOnTop: options.alwaysOnTop,
    isUnique: true,
  };

  await createSecondaryWindow(config);
  return id;
}

export function closeSecondaryWindow(id: string): void {
  const window = windowRegistry.get(id);
  if (!window) {
    logger.debug(`closeSecondaryWindow: window ${id} not in registry`);
    return;
  }
  window.close();
}

export function focusWindow(id: string): void {
  const window = windowRegistry.get(id);
  if (!window) return;
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

export function listOpenWindows(): WindowInfo[] {
  return windowRegistry.list();
}
