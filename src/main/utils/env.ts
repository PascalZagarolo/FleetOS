import { app } from 'electron';
import { APP_CONFIG } from '../../shared/constants';

export const isDevelopment = !app.isPackaged;
export const isProduction = app.isPackaged;
export const isMac = process.platform === 'darwin';
export const isWindows = process.platform === 'win32';
export const isLinux = process.platform === 'linux';

export function getAppUrl(): string {
  if (isDevelopment) {
    return process.env.ELECTRON_DEV_URL ?? APP_CONFIG.developmentUrl;
  }
  return APP_CONFIG.productionUrl;
}
