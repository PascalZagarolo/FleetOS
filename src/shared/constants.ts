export const APP_CONFIG = {
  name: 'Fleet OS',
  protocol: 'fleetos',
  bundleId: 'com.urent.fleetos',

  productionUrl: 'https://fleet-os.urent-rental.de',
  developmentUrl: 'http://localhost:3000',

  defaultWindowBounds: {
    width: 1440,
    height: 900,
  },
  minWindowBounds: {
    width: 1024,
    height: 640,
  },

  storageKeys: {
    windowBounds: 'window.bounds',
    windowMaximized: 'window.maximized',
    lastVersion: 'app.lastVersion',
    autoLaunch: 'preferences.autoLaunch',
  },
} as const;

export const ALLOWED_HOSTS = [
  'fleet-os.urent-rental.de',
  'www.urent-rental.de',
  'urent-rental.de',
  'localhost',
  '127.0.0.1',
  // OAuth providers — the full flow must stay inside the Electron window so
  // cookies set during init (codeVerifier, state) remain in the same jar when
  // the callback returns to www.urent-rental.de. Kicking these out to the
  // external browser fragments the cookie jar and breaks the callback.
  'accounts.google.com',
  'oauth2.googleapis.com',
  'github.com',
] as const;
