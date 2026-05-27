# Fleet OS Desktop

Native Desktop-Wrapper fuer Fleet OS — laedt `https://fleet-os.urent-rental.de`
in einer Electron-Shell mit Window-State-Persistenz, Single-Instance-Lock,
Code-Signing-fertiger Build-Pipeline und IPC-Bridge zur Webapp.

## Architektur

- **Main process** (`src/main/`) — Electron-Lifecycle, Window-Management,
  IPC-Handlers, Native-Menue, System-Integration.
- **Preload script** (`src/preload/`) — context-isolierte Bridge, expose
  typed API als `window.electron` im Renderer.
- **Shared** (`src/shared/`) — Konstanten, IPC-Channel-Namen, Types die
  Main + Preload teilen.
- **Renderer** ist die deployed Next.js-App auf `fleet-os.urent-rental.de`
  (oder `localhost:3000` im Dev-Mode). Kein Bundling im Desktop-Repo.

## Dev-Setup

```bash
npm install
npm run dev
```

`npm run dev` startet drei Watchers parallel: tsc fuer Main, tsc fuer Preload,
Electron mit Auto-Reload sobald die Builds bereit sind. In dieser Konfig
zeigt der Electron-Fenster `http://localhost:3000` an — also muss die
Webapp im urent-Repo (`npm run dev`) parallel laufen.

## Lokaler Build (ohne Code-Signing)

```bash
npm run dist:mac
npm run dist:win
npm run dist:linux
```

Output landet in `dist-app/`.

## Production-Release

GitHub-Action `.github/workflows/build.yml` triggert auf Tag-Push:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Voraussetzung: GitHub-Secrets fuer Code-Signing sind gesetzt (siehe
`docs/setup-signing.md` oder `Documents/fleet-os-todos.txt`).
