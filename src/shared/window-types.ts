import type { WindowBounds } from './types';

export type WindowType = 'main' | 'app' | 'detail' | 'tool' | 'popup';

export type AppWindowId =
  | 'buchungen'
  | 'uebergaben'
  | 'fahrzeuge'
  | 'kunden'
  | 'kalender'
  | 'analytics'
  | 'kommunikation'
  | 'einstellungen';

export interface WindowConfig {
  id: string;
  type: WindowType;
  appId?: AppWindowId;
  detailType?: string;
  detailId?: string;
  url: string;
  title: string;

  defaultBounds: WindowBounds;
  minBounds: WindowBounds;
  maxBounds?: WindowBounds;
  resizable: boolean;
  alwaysOnTop?: boolean;

  closable: boolean;
  minimizable: boolean;
  maximizable: boolean;

  isUnique?: boolean;
  parentWindowId?: string;
}

export interface SavedWindowState {
  id: string;
  config: WindowConfig;
  bounds: WindowBounds;
  isMaximized: boolean;
  isFullScreen: boolean;
  displayId?: number;
  lastOpenedAt: number;
}

export interface WindowInfo {
  id: string;
  type: WindowType;
  appId?: AppWindowId;
  detailType?: string;
  detailId?: string;
  title: string;
  isFocused: boolean;
}

export interface BroadcastMessage {
  type: string;
  payload: unknown;
  source?: string;
  targets?: string[];
  excludeSource?: boolean;
}
