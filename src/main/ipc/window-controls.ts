import { ipcMain, BrowserWindow, Menu } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';

export function setupWindowControlHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.maximize();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_UNMAXIMIZE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.unmaximize();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE, (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return;
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
  });

  ipcMain.handle(
    IPC_CHANNELS.SHOW_TITLE_BAR_MENU,
    (event, position: { x: number; y: number }) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window || window.isDestroyed()) return;

      const isMaximized = window.isMaximized();

      const template: MenuItemConstructorOptions[] = [
        {
          label: 'Wiederherstellen',
          enabled: isMaximized || window.isMinimized(),
          click: () => {
            if (window.isMaximized()) window.unmaximize();
            if (window.isMinimized()) window.restore();
          },
        },
        { type: 'separator' },
        {
          label: 'Minimieren',
          click: () => window.minimize(),
        },
        {
          label: isMaximized ? 'Wiederherstellen' : 'Maximieren',
          click: () => {
            if (window.isMaximized()) window.unmaximize();
            else window.maximize();
          },
        },
        { type: 'separator' },
        {
          label: 'Schliessen',
          accelerator: 'CmdOrCtrl+W',
          click: () => window.close(),
        },
      ];

      const menu = Menu.buildFromTemplate(template);
      menu.popup({
        window,
        x: Math.round(position.x),
        y: Math.round(position.y),
      });
    },
  );
}
