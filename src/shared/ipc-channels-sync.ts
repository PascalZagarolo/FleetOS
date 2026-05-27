export const IPC_CHANNELS_CONNECTIVITY = {
  // Renderer -> Main
  GET_STATUS: 'connectivity:get-status',

  // Main -> Renderer
  CHANGED: 'connectivity:changed',
} as const;
