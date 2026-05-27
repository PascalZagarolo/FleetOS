export const IPC_CHANNELS_UPDATER = {
  // Renderer -> Main
  CHECK_FOR_UPDATES: 'updater:check-for-updates',
  GET_UPDATE_STATE: 'updater:get-state',
  QUIT_AND_INSTALL: 'updater:quit-and-install',
  CANCEL_UPDATE: 'updater:cancel-update',

  // Main -> Renderer
  UPDATE_AVAILABLE: 'updater:update-available',
  UPDATE_NOT_AVAILABLE: 'updater:update-not-available',
  UPDATE_DOWNLOAD_PROGRESS: 'updater:download-progress',
  UPDATE_DOWNLOADED: 'updater:update-downloaded',
  UPDATE_ERROR: 'updater:update-error',
} as const;

export type UpdaterChannel = (typeof IPC_CHANNELS_UPDATER)[keyof typeof IPC_CHANNELS_UPDATER];
