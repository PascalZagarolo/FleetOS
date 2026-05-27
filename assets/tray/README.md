# Tray Icons

Diese Files werden vom System-Tray (macOS-Menuebar, Windows-System-Tray,
Linux-Indicator) genutzt. Aktuell sind alle drei Files Kopien von
`/urent/public/uRent.png` (500x500) — funktional aber bei 16x16 verwaschen.

## Was Production braucht

Aus einem Master-Asset `source.png` (64x64 oder 128x128, transparent):

| File                       | Groesse | Format                          | Zweck                                |
|----------------------------|---------|---------------------------------|--------------------------------------|
| `tray-icon.png`            | 16x16   | PNG, farbig oder grau           | Generic fallback                     |
| `tray-icon@2x.png`         | 32x32   | PNG                             | Retina-Variante                      |
| `tray-icon-Template.png`   | 16x16   | PNG MONOCHROM (schwarz + alpha) | macOS — passt sich Dark/Light an     |
| `tray-icon-Template@2x.png`| 32x32   | PNG MONOCHROM                   | macOS Retina                         |
| `tray-icon-color.png`      | 16x16   | PNG farbig                      | Windows/Linux                        |
| `tray-icon-color@2x.png`   | 32x32   | PNG farbig                      | Windows/Linux Retina                 |

## macOS Template-Image-Konvention

Dateiname MUSS auf `Template` enden (`-Template.png`, `-Template@2x.png`).
macOS invertiert dann automatisch zwischen Dark- und Light-Mode. Bild
muss monochrom sein (nur schwarze Pixel mit unterschiedlichem Alpha).

## Generieren

Sobald Master-Asset da ist und `sharp` installiert (`npm install --save-dev sharp`):

```bash
npm run icons
```

(Erweitere dafuer scripts/build-icons.mjs um den tray-build, siehe Phase-4-Prompt.)

Oder einmalig manuell:

```bash
npx sharp-cli --input source.png --output tray-icon-Template.png resize 16
npx sharp-cli --input source.png --output tray-icon-Template@2x.png resize 32
# usw.
```
