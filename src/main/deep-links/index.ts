import path from 'path';
import { app } from 'electron';
import { logger } from '../utils/logger';
import { getMainWindow, focusMainWindow } from '../window-manager';
import { APP_CONFIG } from '../../shared/constants';
import { IPC_CHANNELS_TRAY, IPC_CHANNELS_DEEP_LINKS } from '../../shared/ipc-channels-tray';

// fleetos:// Protocol fuer Cross-Tool-Workflows.
// Beispiele:
//   fleetos://booking/123
//   fleetos://booking/new
//   fleetos://handover/abc?action=edit
//   fleetos://customer/xyz
//   fleetos://settings/notifications
//
// Wenn ein Email-Link / Slack-Link auf so eine URL zeigt, oeffnet das OS
// die Fleet OS Desktop App und wir routen den User direkt zur passenden
// Webapp-URL.

const PROTOCOL = APP_CONFIG.protocol;
let pendingRoute: string | null = null;

export function setupDeepLinks(): void {
  // Protocol-Registrierung lebt schon aus Phase 1 in main/index.ts.
  // Hier setzen wir nur das macOS open-url + Argv-Parsing auf.
  app.on('open-url', (event, url) => {
    event.preventDefault();
    logger.info(`Deep-link via open-url: ${url}`);
    handleDeepLink(url);
  });
}

// Wird beim Cold-Start (process.argv) UND bei second-instance gerufen
// (Windows/Linux Deep-Links kommen als Command-Line-Argument rein).
export function handleDeepLinkFromArgv(argv: string[]): void {
  const link = argv.find((a) => a.startsWith(`${PROTOCOL}://`));
  if (!link) return;
  logger.info(`Deep-link via argv: ${link}`);
  handleDeepLink(link);
}

function handleDeepLink(url: string): void {
  const parsed = parseDeepLink(url);
  if (!parsed) {
    logger.warn(`Failed to parse deep-link: ${url}`);
    return;
  }
  const route = mapDeepLinkToRoute(parsed);

  const window = getMainWindow();
  if (!window) {
    // App ist noch nicht ready — queue, main/index.ts holt es nach
    // createMainWindow ab.
    pendingRoute = route;
    logger.debug(`Deep-link queued (no window yet): ${route}`);
    return;
  }

  focusMainWindow();
  window.webContents.send(IPC_CHANNELS_TRAY.NAVIGATE_TO, route);
  window.webContents.send(IPC_CHANNELS_DEEP_LINKS.RECEIVED, {
    url,
    route,
    params: parsed.params,
  });
}

export function flushPendingDeepLink(): void {
  if (!pendingRoute) return;
  const route = pendingRoute;
  pendingRoute = null;
  const window = getMainWindow();
  if (!window) return;
  focusMainWindow();
  window.webContents.send(IPC_CHANNELS_TRAY.NAVIGATE_TO, route);
}

type ParsedDeepLink = {
  resource: string;
  id?: string;
  action?: string;
  params: Record<string, string>;
};

function parseDeepLink(url: string): ParsedDeepLink | null {
  try {
    const stripped = url.replace(`${PROTOCOL}://`, '');
    const [pathPart, queryPart] = stripped.split('?');
    const segments = pathPart.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    const params: Record<string, string> = {};
    if (queryPart) {
      const usp = new URLSearchParams(queryPart);
      usp.forEach((v, k) => {
        params[k] = v;
      });
    }

    return {
      resource: segments[0],
      id: segments[1],
      action: segments[2],
      params,
    };
  } catch {
    return null;
  }
}

function mapDeepLinkToRoute(parsed: ParsedDeepLink): string {
  const { resource, id, action, params } = parsed;

  const mappers: Record<string, (id?: string, action?: string) => string> = {
    booking: (id, action) => {
      if (id === 'new') return '/buchungen/neu';
      if (id && action === 'edit') return `/buchungen/${id}/edit`;
      if (id) return `/buchungen/${id}`;
      return '/buchungen';
    },
    handover: (id) => {
      if (id === 'new') return '/uebergabe';
      if (id) return `/uebergabe/${id}`;
      return '/uebergabe';
    },
    customer: (id) => (id ? `/kunden/${id}` : '/kunden'),
    vehicle: (id, action) => {
      if (id === 'new') return '/fahrzeuge/neu';
      if (id) return `/fahrzeuge/${id}`;
      return '/fahrzeuge';
    },
    settings: (id) => (id ? `/settings/${id}` : '/settings'),
    dashboard: () => '/',
  };

  const mapper = mappers[resource];
  if (!mapper) {
    logger.warn(`Unknown deep-link resource: ${resource} — falling back to /`);
    return '/';
  }

  const base = mapper(id, action);
  const queryEntries = Object.entries(params);
  if (queryEntries.length === 0) return base;

  const search = new URLSearchParams(params).toString();
  return base.includes('?') ? `${base}&${search}` : `${base}?${search}`;
}
