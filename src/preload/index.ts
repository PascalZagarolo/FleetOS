import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import { IPC_CHANNELS_UPDATER } from '../shared/ipc-channels-updater';
import {
  IPC_CHANNELS_TRAY,
  IPC_CHANNELS_PREFERENCES,
  IPC_CHANNELS_SHORTCUTS,
  IPC_CHANNELS_AUTO_START,
  IPC_CHANNELS_NOTIFICATIONS,
  IPC_CHANNELS_DEEP_LINKS,
} from '../shared/ipc-channels-tray';
import {
  IPC_CHANNELS_WINDOWS,
  IPC_CHANNELS_BROADCAST,
} from '../shared/ipc-channels-windows';
import { IPC_CHANNELS_DOCUMENTS } from '../shared/ipc-channels-documents';
import { IPC_CHANNELS_CONNECTIVITY } from '../shared/ipc-channels-sync';
import type {
  AppWindowId,
  WindowInfo,
  BroadcastMessage,
} from '../shared/window-types';
import type {
  AppInfo,
  Platform,
  OpenExternalResult,
  UpdateInfo,
  ProgressInfo,
  UpdateState,
  TrayData,
  ShortcutDefinition,
  RichNotificationOptions,
  NotificationPermissionState,
  DndSettings,
  NotificationClickPayload,
  NotificationActionPayload,
  NotificationReplyPayload,
  DeepLinkPayload,
} from '../shared/types';

type Unsubscribe = () => void;

function subscribe(channel: string, callback: () => void): Unsubscribe {
  const handler = () => callback();
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.off(channel, handler);
  };
}

function subscribeWithPayload<T>(
  channel: string,
  callback: (payload: T) => void,
): Unsubscribe {
  const handler = (_event: IpcRendererEvent, payload: T) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.off(channel, handler);
  };
}

const electronAPI = {
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION),
    getInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_INFO),
  },

  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
    unmaximize: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_UNMAXIMIZE),
    toggleMaximize: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE),
    close: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),

    onMaximized: (callback: () => void): Unsubscribe =>
      subscribe(IPC_CHANNELS.WINDOW_MAXIMIZED, callback),
    onUnmaximized: (callback: () => void): Unsubscribe =>
      subscribe(IPC_CHANNELS.WINDOW_UNMAXIMIZED, callback),
    onFocused: (callback: () => void): Unsubscribe =>
      subscribe(IPC_CHANNELS.WINDOW_FOCUSED, callback),
    onBlurred: (callback: () => void): Unsubscribe =>
      subscribe(IPC_CHANNELS.WINDOW_BLURRED, callback),
    onFullscreenEnter: (callback: () => void): Unsubscribe =>
      subscribe(IPC_CHANNELS.WINDOW_FULLSCREEN_ENTER, callback),
    onFullscreenLeave: (callback: () => void): Unsubscribe =>
      subscribe(IPC_CHANNELS.WINDOW_FULLSCREEN_LEAVE, callback),

    showTitleBarMenu: (position: { x: number; y: number }): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.SHOW_TITLE_BAR_MENU, position),
  },

  system: {
    getPlatform: (): Promise<Platform> => ipcRenderer.invoke(IPC_CHANNELS.GET_PLATFORM),
    openExternal: (url: string): Promise<OpenExternalResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, url),
  },

  menu: {
    onOpenPreferences: (callback: () => void): Unsubscribe =>
      subscribe(IPC_CHANNELS.MENU_OPEN_PREFERENCES, callback),
    onNewBooking: (callback: () => void): Unsubscribe =>
      subscribe(IPC_CHANNELS.MENU_NEW_BOOKING, callback),
  },

  tray: {
    updateData: (data: Partial<TrayData>): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS_TRAY.UPDATE_TRAY_DATA, data),
    getData: (): Promise<TrayData> => ipcRenderer.invoke(IPC_CHANNELS_TRAY.GET_TRAY_DATA),
  },

  navigation: {
    onNavigateTo: (callback: (path: string) => void): Unsubscribe =>
      subscribeWithPayload<string>(IPC_CHANNELS_TRAY.NAVIGATE_TO, callback),
    onOpenSpotlight: (callback: () => void): Unsubscribe =>
      subscribe(IPC_CHANNELS_TRAY.OPEN_SPOTLIGHT, callback),
  },

  preferences: {
    get: (key: string): Promise<unknown> =>
      ipcRenderer.invoke(IPC_CHANNELS_PREFERENCES.GET, key),
    set: (key: string, value: unknown): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS_PREFERENCES.SET, key, value),
  },

  shortcuts: {
    getAll: (): Promise<ShortcutDefinition[]> =>
      ipcRenderer.invoke(IPC_CHANNELS_SHORTCUTS.GET_ALL),
    update: (id: string, accelerator: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS_SHORTCUTS.UPDATE, id, accelerator),
    reset: (id: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS_SHORTCUTS.RESET, id),
  },

  autoStart: {
    enable: (enabled: boolean): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS_AUTO_START.ENABLE, enabled),
    isEnabled: (): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS_AUTO_START.STATUS),
  },

  notifications: {
    show: (options: RichNotificationOptions): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS_NOTIFICATIONS.SHOW, options),
    getPermissionStatus: (): Promise<NotificationPermissionState> =>
      ipcRenderer.invoke(IPC_CHANNELS_NOTIFICATIONS.GET_PERMISSION_STATUS),
    requestPermission: (): Promise<NotificationPermissionState> =>
      ipcRenderer.invoke(IPC_CHANNELS_NOTIFICATIONS.REQUEST_PERMISSION),
    getPreferences: (): Promise<{
      preferences: Record<string, boolean>;
      dnd: DndSettings;
    }> => ipcRenderer.invoke(IPC_CHANNELS_NOTIFICATIONS.GET_PREFERENCES),
    setPreferences: (prefs: Record<string, boolean>): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS_NOTIFICATIONS.SET_PREFERENCES, prefs),
    setDnd: (dnd: DndSettings): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS_NOTIFICATIONS.SET_DND, dnd),

    onClicked: (callback: (payload: NotificationClickPayload) => void): Unsubscribe =>
      subscribeWithPayload<NotificationClickPayload>(
        IPC_CHANNELS_NOTIFICATIONS.CLICKED,
        callback,
      ),
    onAction: (callback: (payload: NotificationActionPayload) => void): Unsubscribe =>
      subscribeWithPayload<NotificationActionPayload>(
        IPC_CHANNELS_NOTIFICATIONS.ACTION,
        callback,
      ),
    onReply: (callback: (payload: NotificationReplyPayload) => void): Unsubscribe =>
      subscribeWithPayload<NotificationReplyPayload>(
        IPC_CHANNELS_NOTIFICATIONS.REPLY,
        callback,
      ),
  },

  deepLinks: {
    onReceived: (callback: (payload: DeepLinkPayload) => void): Unsubscribe =>
      subscribeWithPayload<DeepLinkPayload>(IPC_CHANNELS_DEEP_LINKS.RECEIVED, callback),
  },

  windows: {
    openApp: (appId: AppWindowId): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS_WINDOWS.OPEN_APP_WINDOW, appId),
    openTab: (tabId: string, userId: string): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS_WINDOWS.OPEN_TAB_WINDOW, { tabId, userId }),
    openDetail: (params: {
      detailType: string;
      detailId: string;
      options?: { title?: string; bounds?: { width: number; height: number } };
    }): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS_WINDOWS.OPEN_DETAIL_WINDOW, params),
    openTool: (params: {
      toolId: string;
      options: {
        url: string;
        title: string;
        bounds: { width: number; height: number };
        alwaysOnTop?: boolean;
      };
    }): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS_WINDOWS.OPEN_TOOL_WINDOW, params),
    close: (id: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS_WINDOWS.CLOSE_WINDOW, id),
    focus: (id: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS_WINDOWS.FOCUS_WINDOW, id),
    list: (): Promise<WindowInfo[]> =>
      ipcRenderer.invoke(IPC_CHANNELS_WINDOWS.LIST_WINDOWS),
    getCurrentInfo: (): Promise<WindowInfo | null> =>
      ipcRenderer.invoke(IPC_CHANNELS_WINDOWS.GET_CURRENT_WINDOW_INFO),

    onListChanged: (callback: (list: WindowInfo[]) => void): Unsubscribe =>
      subscribeWithPayload<WindowInfo[]>(IPC_CHANNELS_WINDOWS.WINDOW_LIST_CHANGED, callback),
    onDisplayChanged: (
      callback: (payload: { displayId: number; displayBounds: Electron.Rectangle }) => void,
    ): Unsubscribe =>
      subscribeWithPayload<{ displayId: number; displayBounds: Electron.Rectangle }>(
        IPC_CHANNELS_WINDOWS.DISPLAY_CHANGED,
        callback,
      ),
  },

  broadcast: {
    send: (message: Omit<BroadcastMessage, 'source'>): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS_BROADCAST.SEND, message),
    onReceive: (
      callback: (payload: { type: string; payload: unknown; source?: string }) => void,
    ): Unsubscribe =>
      subscribeWithPayload<{ type: string; payload: unknown; source?: string }>(
        IPC_CHANNELS_BROADCAST.MESSAGE,
        callback,
      ),
  },

  documents: {
    import: (options?: {
      multiple?: boolean;
      filters?: Array<{ name: string; extensions: string[] }>;
      parentWindowId?: string;
    }): Promise<
      Array<{
        id: string;
        filename: string;
        mimeType: string;
        size: number;
        hash: string;
        localPath: string;
      }>
    > => ipcRenderer.invoke(IPC_CHANNELS_DOCUMENTS.IMPORT, options ?? {}),

    readBase64: (id: string, filename: string): Promise<string | null> =>
      ipcRenderer.invoke(IPC_CHANNELS_DOCUMENTS.READ_BASE64, { id, filename }),

    open: (id: string, filename: string): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS_DOCUMENTS.OPEN, { id, filename }),

    export: (
      id: string,
      filename: string,
      parentWindowId?: string,
    ): Promise<{ ok: boolean; targetPath?: string; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS_DOCUMENTS.EXPORT, { id, filename, parentWindowId }),

    delete: (id: string, filename: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS_DOCUMENTS.DELETE, { id, filename }),

    reveal: (id: string, filename: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS_DOCUMENTS.REVEAL, { id, filename }),

    getLocalPath: (id: string, filename: string): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS_DOCUMENTS.GET_LOCAL_PATH, { id, filename }),
  },

  connectivity: {
    getStatus: (): Promise<{ online: boolean; lastCheckedAt: number }> =>
      ipcRenderer.invoke(IPC_CHANNELS_CONNECTIVITY.GET_STATUS),
    onChanged: (
      callback: (payload: { online: boolean; lastCheckedAt: number }) => void,
    ): Unsubscribe =>
      subscribeWithPayload<{ online: boolean; lastCheckedAt: number }>(
        IPC_CHANNELS_CONNECTIVITY.CHANGED,
        callback,
      ),
  },

  updater: {
    checkForUpdates: (): Promise<UpdateState> =>
      ipcRenderer.invoke(IPC_CHANNELS_UPDATER.CHECK_FOR_UPDATES),
    getState: (): Promise<UpdateState> =>
      ipcRenderer.invoke(IPC_CHANNELS_UPDATER.GET_UPDATE_STATE),
    quitAndInstall: (): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS_UPDATER.QUIT_AND_INSTALL),
    cancelUpdate: (): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS_UPDATER.CANCEL_UPDATE),

    onUpdateAvailable: (callback: (info: UpdateInfo) => void): Unsubscribe =>
      subscribeWithPayload<UpdateInfo>(IPC_CHANNELS_UPDATER.UPDATE_AVAILABLE, callback),
    onUpdateNotAvailable: (callback: () => void): Unsubscribe =>
      subscribe(IPC_CHANNELS_UPDATER.UPDATE_NOT_AVAILABLE, callback),
    onDownloadProgress: (callback: (progress: ProgressInfo) => void): Unsubscribe =>
      subscribeWithPayload<ProgressInfo>(
        IPC_CHANNELS_UPDATER.UPDATE_DOWNLOAD_PROGRESS,
        callback,
      ),
    onUpdateDownloaded: (callback: (info: UpdateInfo) => void): Unsubscribe =>
      subscribeWithPayload<UpdateInfo>(IPC_CHANNELS_UPDATER.UPDATE_DOWNLOADED, callback),
    onUpdateError: (callback: (error: string) => void): Unsubscribe =>
      subscribeWithPayload<string>(IPC_CHANNELS_UPDATER.UPDATE_ERROR, callback),
  },
} as const;

export type ElectronAPI = typeof electronAPI;

try {
  contextBridge.exposeInMainWorld('electron', electronAPI);
  console.log('[preload] Electron API exposed');
} catch (error) {
  console.error('[preload] Failed to expose Electron API:', error);
}
