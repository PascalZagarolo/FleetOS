import type { WindowConfig, AppWindowId } from './window-types';

type AppPreset = Omit<WindowConfig, 'id' | 'type' | 'appId'>;

export const APP_WINDOW_PRESETS: Record<AppWindowId, AppPreset> = {
  buchungen: {
    url: '/buchungen',
    title: 'Buchungen | Fleet OS',
    defaultBounds: { width: 1200, height: 800 },
    minBounds: { width: 800, height: 600 },
    resizable: true,
    closable: true,
    minimizable: true,
    maximizable: true,
  },
  uebergaben: {
    url: '/uebergabe',
    title: 'Uebergaben | Fleet OS',
    defaultBounds: { width: 1100, height: 750 },
    minBounds: { width: 800, height: 600 },
    resizable: true,
    closable: true,
    minimizable: true,
    maximizable: true,
  },
  fahrzeuge: {
    url: '/fahrzeuge',
    title: 'Fahrzeuge | Fleet OS',
    defaultBounds: { width: 1300, height: 850 },
    minBounds: { width: 900, height: 600 },
    resizable: true,
    closable: true,
    minimizable: true,
    maximizable: true,
  },
  kunden: {
    url: '/kunden',
    title: 'Kunden | Fleet OS',
    defaultBounds: { width: 1100, height: 750 },
    minBounds: { width: 800, height: 600 },
    resizable: true,
    closable: true,
    minimizable: true,
    maximizable: true,
  },
  kalender: {
    url: '/kalender',
    title: 'Kalender | Fleet OS',
    defaultBounds: { width: 1400, height: 900 },
    minBounds: { width: 900, height: 600 },
    resizable: true,
    closable: true,
    minimizable: true,
    maximizable: true,
  },
  analytics: {
    url: '/analytics',
    title: 'Analytics | Fleet OS',
    defaultBounds: { width: 1500, height: 950 },
    minBounds: { width: 1100, height: 700 },
    resizable: true,
    closable: true,
    minimizable: true,
    maximizable: true,
  },
  kommunikation: {
    url: '/kommunikation',
    title: 'Kommunikation | Fleet OS',
    defaultBounds: { width: 1000, height: 750 },
    minBounds: { width: 700, height: 500 },
    resizable: true,
    closable: true,
    minimizable: true,
    maximizable: true,
  },
  einstellungen: {
    url: '/settings',
    title: 'Einstellungen | Fleet OS',
    defaultBounds: { width: 900, height: 700 },
    minBounds: { width: 600, height: 500 },
    resizable: true,
    closable: true,
    minimizable: true,
    maximizable: false,
    isUnique: true,
  },
};

export const DETAIL_URL_BUILDERS: Record<string, (id: string) => string> = {
  booking: (id) => `/buchungen/${id}`,
  handover: (id) => `/uebergabe/${id}`,
  customer: (id) => `/kunden/${id}`,
  vehicle: (id) => `/fahrzeuge/${id}`,
};

export const DEFAULT_DETAIL_TITLE: Record<string, string> = {
  booking: 'Buchung',
  handover: 'Uebergabe',
  customer: 'Kunde',
  vehicle: 'Fahrzeug',
};
