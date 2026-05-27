// Lifecycle-Flag fuer Quit-Detection.
//
// Wird vom Tray-"Beenden", Cmd+Q (Menu) und before-quit gesetzt, damit der
// window.on('close')-Handler in window-manager einen echten Quit von einem
// Minimize-to-Tray unterscheiden kann.
//
// Bewusst kein module-augmentation auf Electron's App-Class — dort
// kollidiert das mit der Class-Definition.

let isQuittingFlag = false;

export function markQuitting(): void {
  isQuittingFlag = true;
}

export function isQuitting(): boolean {
  return isQuittingFlag;
}
