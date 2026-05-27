// macOS Notarization Hook fuer electron-builder.
//
// Wird nach dem Signing automatisch ausgefuehrt (siehe package.json
// "build.afterSign"). Notarizet nur unter folgenden Bedingungen:
//   - Platform = darwin
//   - APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID sind gesetzt
//
// Local-Build ohne diese Env-Vars laeuft durch ohne Notarization (App ist
// signed aber nicht notarized — fuer Test-Distribution OK, fuer Public
// Release nicht).

const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const { APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID } = process.env;

  if (!APPLE_ID || !APPLE_APP_SPECIFIC_PASSWORD || !APPLE_TEAM_ID) {
    console.warn(
      '[notarize] Skipping — APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID not set.',
    );
    console.warn('[notarize] Build will be code-signed but not notarized.');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  if (!fs.existsSync(appPath)) {
    console.error(`[notarize] App not found at ${appPath}`);
    return;
  }

  console.log(`[notarize] Notarizing ${appName} at ${appPath}`);

  // @electron/notarize ist optional installiert. Wenn nicht da: nicht crashen,
  // sondern warnen — Build hat trotzdem ein signed .app produziert.
  let notarize;
  try {
    notarize = require('@electron/notarize').notarize;
  } catch (err) {
    console.warn('[notarize] @electron/notarize not installed, skipping');
    return;
  }

  await notarize({
    tool: 'notarytool',
    appPath,
    appleId: APPLE_ID,
    appleIdPassword: APPLE_APP_SPECIFIC_PASSWORD,
    teamId: APPLE_TEAM_ID,
  });

  console.log('[notarize] Notarization complete');
};
