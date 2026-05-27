import { Menu, shell, BrowserWindow } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { isMac } from '../utils/env';
import { APP_CONFIG } from '../../shared/constants';
import { IPC_CHANNELS } from '../../shared/ipc-channels';

export function setupApplicationMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: APP_CONFIG.name,
            submenu: [
              { role: 'about', label: `Ueber ${APP_CONFIG.name}` },
              { type: 'separator' },
              {
                label: 'Einstellungen...',
                accelerator: 'Cmd+,',
                click: () => {
                  const window = BrowserWindow.getFocusedWindow();
                  window?.webContents.send(IPC_CHANNELS.MENU_OPEN_PREFERENCES);
                },
              },
              { type: 'separator' },
              { role: 'hide', label: `${APP_CONFIG.name} ausblenden` },
              { role: 'hideOthers', label: 'Andere ausblenden' },
              { role: 'unhide', label: 'Alle anzeigen' },
              { type: 'separator' },
              { role: 'quit', label: `${APP_CONFIG.name} beenden` },
            ],
          },
        ] as MenuItemConstructorOptions[])
      : []),

    {
      label: 'Datei',
      submenu: [
        {
          label: 'Neue Buchung',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            const window = BrowserWindow.getFocusedWindow();
            window?.webContents.send(IPC_CHANNELS.MENU_NEW_BOOKING);
          },
        },
        { type: 'separator' },
        ...(isMac ? [] : ([{ role: 'quit', label: 'Beenden' }] as MenuItemConstructorOptions[])),
      ],
    },

    {
      label: 'Bearbeiten',
      submenu: [
        { role: 'undo', label: 'Rueckgaengig' },
        { role: 'redo', label: 'Wiederherstellen' },
        { type: 'separator' },
        { role: 'cut', label: 'Ausschneiden' },
        { role: 'copy', label: 'Kopieren' },
        { role: 'paste', label: 'Einfuegen' },
        { role: 'selectAll', label: 'Alles auswaehlen' },
      ],
    },

    {
      label: 'Anzeige',
      submenu: [
        { role: 'reload', label: 'Neu laden' },
        { role: 'forceReload', label: 'Neu laden (Cache leeren)' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Originalgroesse' },
        { role: 'zoomIn', label: 'Vergroessern' },
        { role: 'zoomOut', label: 'Verkleinern' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Vollbild' },
        { type: 'separator' },
        ...(isMac
          ? []
          : ([{ role: 'toggleDevTools', label: 'Entwicklertools' }] as MenuItemConstructorOptions[])),
      ],
    },

    {
      label: 'Fenster',
      submenu: [
        { role: 'minimize', label: 'Minimieren' },
        { role: 'zoom', label: 'Zoomen' },
        ...(isMac
          ? ([
              { type: 'separator' },
              { role: 'front', label: 'Alle nach vorne bringen' },
            ] as MenuItemConstructorOptions[])
          : ([{ role: 'close', label: 'Schliessen' }] as MenuItemConstructorOptions[])),
      ],
    },

    {
      label: 'Hilfe',
      submenu: [
        {
          label: 'Dokumentation',
          click: () => {
            void shell.openExternal('https://www.urent-rental.de/fleet-os');
          },
        },
        {
          label: 'Support kontaktieren',
          click: () => {
            void shell.openExternal('mailto:pascal@urent-rental.de');
          },
        },
        { type: 'separator' },
        {
          label: 'uRent-Website',
          click: () => {
            void shell.openExternal('https://www.urent-rental.de');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
