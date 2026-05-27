export const IPC_CHANNELS_TRAY = {
  // Renderer -> Main
  UPDATE_TRAY_DATA: 'tray:update-data',
  GET_TRAY_DATA: 'tray:get-data',

  // Main -> Renderer (vom Tray-Menu oder Global-Shortcut getriggert)
  NAVIGATE_TO: 'app:navigate-to',
  OPEN_SPOTLIGHT: 'app:open-spotlight',
} as const;

export const IPC_CHANNELS_PREFERENCES = {
  GET: 'preferences:get',
  SET: 'preferences:set',
} as const;

export const IPC_CHANNELS_SHORTCUTS = {
  GET_ALL: 'shortcuts:get-all',
  UPDATE: 'shortcuts:update',
  RESET: 'shortcuts:reset',
} as const;

export const IPC_CHANNELS_AUTO_START = {
  ENABLE: 'auto-start:enable',
  STATUS: 'auto-start:status',
} as const;

export const IPC_CHANNELS_NOTIFICATIONS = {
  SHOW: 'notifications:show',
  GET_PERMISSION_STATUS: 'notifications:get-permission-status',
  REQUEST_PERMISSION: 'notifications:request-permission',
  SET_PREFERENCES: 'notifications:set-preferences',
  GET_PREFERENCES: 'notifications:get-preferences',
  SET_DND: 'notifications:set-dnd',

  // Main -> Renderer
  CLICKED: 'notification:clicked',
  ACTION: 'notification:action',
  REPLY: 'notification:reply',
} as const;

export const IPC_CHANNELS_DEEP_LINKS = {
  // Main -> Renderer
  RECEIVED: 'deep-link:received',
} as const;
