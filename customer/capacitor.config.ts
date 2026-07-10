import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.purbanchal.papers',
  appName: 'PurbanchalPapers',
  webDir: 'dist',
  // Load the live production site directly, so the app auto-reflects every
  // deployment to onlineppw.com (no separate OTA needed) and avoids the blank
  // screen the bundled build hits under Capacitor's local https://localhost
  // scheme. The bundled `dist` remains as an offline fallback only.
  server: {
    url: 'https://onlineppw.com',
    cleartext: false,
  },
  plugins: {
    // Block screenshots & screen recording on the native app (FLAG_SECURE on
    // Android; obscured snapshot on iOS). No effect on the web build.
    PrivacyScreen: {
      enable: true,
      // Android: also blocks screen recording, not just stills.
      preventScreenshots: true,
    },
    // Capgo live (OTA) updates. Kept PASSIVE until a Capgo backend is configured:
    // with autoUpdate off, the plugin never contacts a server on launch, so the
    // bundled web app loads instantly (an enabled+unconfigured updater blocks the
    // WebView on a blank screen while it waits on a backend that doesn't exist yet).
    //
    // >>> To turn OTA ON after finishing Capgo setup (see SETUP-MOBILE.md), set:
    //       autoUpdate: true,
    // Then CI's `capgo bundle upload` on each deploy reaches installed apps.
    CapacitorUpdater: {
      autoUpdate: false,
    },
  },
};

export default config;
