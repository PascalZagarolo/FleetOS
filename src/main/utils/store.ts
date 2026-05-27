import Store from 'electron-store';
import { APP_CONFIG } from '../../shared/constants';
import type { WindowBounds } from '../../shared/types';

type StoreSchema = {
  window: {
    bounds: WindowBounds;
    maximized: boolean;
  };
  app: {
    lastVersion: string;
  };
  preferences: {
    autoLaunch: boolean;
    minimizeToTray: boolean;
  };
};

export const store = new Store<StoreSchema>({
  defaults: {
    window: {
      bounds: APP_CONFIG.defaultWindowBounds,
      maximized: false,
    },
    app: {
      lastVersion: '0.0.0',
    },
    preferences: {
      autoLaunch: false,
      minimizeToTray: true,
    },
  },
});
