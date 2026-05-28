import { BrowserWindow } from 'electron';
import { logger } from './utils/logger';

/**
 * Instant local splash window — shown the moment the app launches, before
 * the main window's remote webview (fleet-os.urent-rental.de) has loaded.
 * Discord/Slack pattern: bridge the cold-start + remote-load gap with a
 * branded screen instead of a blank or delayed window.
 *
 * Lifecycle:
 *   - createSplashWindow() in app.whenReady (as early as possible)
 *   - closeSplash() from the main window's 'ready-to-show' handler
 *
 * The HTML is inlined as a data URL so there's zero filesystem / network
 * dependency — it paints immediately.
 */

let splashWindow: BrowserWindow | null = null;

const SPLASH_HTML = `<!doctype html>
<html><head><meta charset="utf-8"/>
<style>
  html,body{margin:0;height:100%;overflow:hidden;background:#0F0F0F;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
    -webkit-font-smoothing:antialiased;}
  .wrap{height:100vh;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:18px;
    background:radial-gradient(ellipse 90% 70% at 50% 40%,#15151E 0%,#0A0A0B 75%);}
  .mark{width:84px;height:84px;animation:fos-rise 480ms cubic-bezier(0.16,1,0.3,1) both;}
  .word{font-size:13px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;
    color:#A8A8B3;animation:fos-rise 480ms cubic-bezier(0.16,1,0.3,1) 80ms both;}
  .bar{width:140px;height:2px;border-radius:2px;background:rgba(255,255,255,0.06);
    overflow:hidden;animation:fos-rise 480ms cubic-bezier(0.16,1,0.3,1) 160ms both;}
  .bar>span{display:block;height:100%;width:40%;border-radius:2px;
    background:linear-gradient(90deg,transparent,#7F77DD,transparent);
    animation:fos-slide 1.1s ease-in-out infinite;}
  @keyframes fos-slide{0%{transform:translateX(-120%);}100%{transform:translateX(320%);}}
  @keyframes fos-rise{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
</style></head>
<body><div class="wrap">
  <svg class="mark" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7F77DD"/><stop offset="100%" stop-color="#5B54B8"/>
    </linearGradient></defs>
    <rect width="1024" height="1024" rx="230" fill="url(#g)"/>
    <rect x="272" y="230" width="156" height="564" rx="8" fill="#fff"/>
    <rect x="272" y="230" width="480" height="132" rx="8" fill="#fff"/>
    <rect x="272" y="434" width="348" height="116" rx="8" fill="#fff"/>
  </svg>
  <div class="word">Fleet OS</div>
  <div class="bar"><span></span></div>
</div></body></html>`;

export function createSplashWindow(): void {
  splashWindow = new BrowserWindow({
    width: 440,
    height: 340,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    center: true,
    backgroundColor: '#0F0F0F',
    show: false,
    webPreferences: {
      // No preload / nodeIntegration — the splash is a static, trusted,
      // self-contained document. Keep its surface minimal.
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(SPLASH_HTML)}`);
  splashWindow.once('ready-to-show', () => splashWindow?.show());
  splashWindow.on('closed', () => { splashWindow = null; });
  logger.info('Splash window created');
}

export function closeSplash(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  splashWindow = null;
}
