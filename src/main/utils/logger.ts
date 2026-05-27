import path from 'path';
import { app } from 'electron';
import log from 'electron-log';

log.transports.file.resolvePathFn = () =>
  path.join(app.getPath('userData'), 'logs/fleet-os.log');

log.transports.file.maxSize = 10 * 1024 * 1024;
log.transports.console.level = 'debug';
log.transports.file.level = 'info';

export const logger = log;
