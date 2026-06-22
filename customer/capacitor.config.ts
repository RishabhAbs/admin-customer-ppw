import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.purbanchal.papers',
  appName: 'PurbanchalPapers',
  webDir: 'dist',
  plugins: {
    // Block screenshots & screen recording on the native app (FLAG_SECURE on
    // Android; obscured snapshot on iOS). No effect on the web build.
    PrivacyScreen: {
      enable: true,
      // Android: also blocks screen recording, not just stills.
      preventScreenshots: true,
    },
  },
};

export default config;
