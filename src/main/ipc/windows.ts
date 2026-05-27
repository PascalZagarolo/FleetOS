import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS_WINDOWS } from '../../shared/ipc-channels-windows';
import {
  openAppWindow,
  openTabWindow,
  openDetailWindow,
  openToolWindow,
  closeSecondaryWindow,
  focusWindow,
  listOpenWindows,
} from '../windows/service';
import { windowRegistry } from '../windows/registry';
import type { AppWindowId } from '../../shared/window-types';

export function setupWindowsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS_WINDOWS.OPEN_APP_WINDOW, async (_event, appId: AppWindowId) => {
    return openAppWindow(appId);
  });

  ipcMain.handle(
    IPC_CHANNELS_WINDOWS.OPEN_TAB_WINDOW,
    async (_event, params: { tabId: string; userId: string }) => {
      return openTabWindow(params.tabId, params.userId);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS_WINDOWS.OPEN_DETAIL_WINDOW,
    async (
      _event,
      params: { detailType: string; detailId: string; options?: { title?: string; bounds?: { width: number; height: number } } },
    ) => {
      return openDetailWindow(params.detailType, params.detailId, params.options);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS_WINDOWS.OPEN_TOOL_WINDOW,
    async (
      _event,
      params: {
        toolId: string;
        options: { url: string; title: string; bounds: { width: number; height: number }; alwaysOnTop?: boolean };
      },
    ) => {
      return openToolWindow(params.toolId, params.options);
    },
  );

  ipcMain.handle(IPC_CHANNELS_WINDOWS.CLOSE_WINDOW, (_event, id: string) => {
    closeSecondaryWindow(id);
  });

  ipcMain.handle(IPC_CHANNELS_WINDOWS.FOCUS_WINDOW, (_event, id: string) => {
    focusWindow(id);
  });

  ipcMain.handle(IPC_CHANNELS_WINDOWS.LIST_WINDOWS, () => {
    return listOpenWindows();
  });

  ipcMain.handle(IPC_CHANNELS_WINDOWS.GET_CURRENT_WINDOW_INFO, (event) => {
    const sender = BrowserWindow.fromWebContents(event.sender);
    if (!sender) return null;
    const entry = windowRegistry.findByBrowserWindow(sender);
    if (!entry) return null;
    return {
      id: entry.config.id,
      type: entry.config.type,
      appId: entry.config.appId,
      detailType: entry.config.detailType,
      detailId: entry.config.detailId,
      title: entry.config.title,
      isFocused: entry.window.isFocused(),
    };
  });
}
