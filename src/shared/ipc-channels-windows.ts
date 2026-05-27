export const IPC_CHANNELS_WINDOWS = {
  // Renderer -> Main
  OPEN_APP_WINDOW: 'windows:open-app',
  OPEN_TAB_WINDOW: 'windows:open-tab',
  OPEN_DETAIL_WINDOW: 'windows:open-detail',
  OPEN_TOOL_WINDOW: 'windows:open-tool',
  CLOSE_WINDOW: 'windows:close',
  FOCUS_WINDOW: 'windows:focus',
  LIST_WINDOWS: 'windows:list',
  GET_CURRENT_WINDOW_INFO: 'windows:get-current-info',

  // Main -> Renderer
  WINDOW_LIST_CHANGED: 'windows:list-changed',
  DISPLAY_CHANGED: 'windows:display-changed',
} as const;

export const IPC_CHANNELS_BROADCAST = {
  SEND: 'broadcast:send',
  MESSAGE: 'broadcast:message',
} as const;
