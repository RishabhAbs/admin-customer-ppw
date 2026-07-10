import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

// Capgo live (OTA) updates. With `autoUpdate` enabled in capacitor.config.ts the
// plugin polls Capgo on launch, downloads any newer web bundle in the background,
// and swaps it in on the next app start — so a `capgo bundle upload` from CI reaches
// every installed app with no Play Store / reinstall step.
//
// notifyAppReady() MUST be called once after the web layer has booted. If it isn't
// called within the timeout, Capgo assumes the new bundle is broken and rolls back
// to the previous good one — this is the safety net that prevents a bad OTA push
// from bricking installs.
export async function initLiveUpdates(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await CapacitorUpdater.notifyAppReady();
  } catch (err) {
    // Non-fatal on web/dev or if the plugin isn't present in this build.
    console.warn('[capgo] notifyAppReady failed', err);
  }
}
