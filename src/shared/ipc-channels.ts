export const IPC_CHANNELS = {
  // App-Info
  GET_APP_VERSION: 'app:get-version',
  GET_APP_INFO: 'app:get-info',

  // Window-Controls (Renderer -> Main)
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_UNMAXIMIZE: 'window:unmaximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',
  WINDOW_TOGGLE_MAXIMIZE: 'window:toggle-maximize',

  // System
  GET_PLATFORM: 'system:get-platform',
  OPEN_EXTERNAL: 'system:open-external',

  // Events (Main -> Renderer)
  WINDOW_MAXIMIZED: 'window:maximized',
  WINDOW_UNMAXIMIZED: 'window:unmaximized',
  WINDOW_FOCUSED: 'window:focused',
  WINDOW_BLURRED: 'window:blurred',
  WINDOW_FULLSCREEN_ENTER: 'window:fullscreen-enter',
  WINDOW_FULLSCREEN_LEAVE: 'window:fullscreen-leave',

  // Title-bar context-menu (Renderer -> Main)
  SHOW_TITLE_BAR_MENU: 'window:show-title-bar-menu',

  // Menu-driven events (Main -> Renderer)
  MENU_OPEN_PREFERENCES: 'menu:open-preferences',
  MENU_NEW_BOOKING: 'menu:new-booking',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
