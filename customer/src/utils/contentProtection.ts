// Content protection for the customer app.
//
// Goal: deter customers from saving product images and (on Android) block
// screenshots/screen recording. Honest scope:
//   - WEB: screenshots CANNOT be blocked (OS-level). We only deter image
//     saving — right-click, drag, and the mobile long-press "Save image" menu.
//   - ANDROID (Capacitor): screenshots/recording ARE hard-blocked via
//     FLAG_SECURE, applied by @capacitor-community/privacy-screen (enabled in
//     capacitor.config.ts). enableScreenshotBlock() is the JS entry point.

const isCapacitor = () => typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor;

// ── WEB DETERRENTS ──────────────────────────────────────────────────────────
// Attach global listeners that suppress the common image-saving gestures.
// Returns a cleanup function. Safe to call in a browser or in the WebView.
export function enableWebImageProtection(): () => void {
  // Block the right-click / long-press context menu everywhere. This kills
  // both desktop "Save image as…" and the mobile long-press image menu.
  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  // Block dragging an <img> out to the desktop / another app.
  const onDragStart = (e: DragEvent) => {
    const t = e.target as HTMLElement;
    if (t && t.tagName === 'IMG') e.preventDefault();
  };

  document.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('dragstart', onDragStart);

  return () => {
    document.removeEventListener('contextmenu', onContextMenu);
    document.removeEventListener('dragstart', onDragStart);
  };
}

// ── ANDROID SCREENSHOT BLOCK ────────────────────────────────────────────────
// Turns on FLAG_SECURE via the PrivacyScreen plugin. No-op on the web (where
// blocking screenshots is impossible). Dynamically imported so the web build
// doesn't hard-depend on the native plugin being installed.
export async function enableScreenshotBlock(): Promise<void> {
  if (!isCapacitor()) return; // web — nothing we can do about screenshots
  try {
    const mod: any = await import('@capacitor-community/privacy-screen');
    const PrivacyScreen = mod.PrivacyScreen;
    if (PrivacyScreen?.enable) {
      await PrivacyScreen.enable();
    }
  } catch (err) {
    // Plugin not installed yet (e.g. before `npx cap add android`) — fail soft.
    // The web deterrents still apply; this only affects the native screenshot block.
    console.warn('Screenshot block unavailable:', err);
  }
}

// Convenience: turn on everything. Returns the web-listener cleanup fn.
export function enableContentProtection(): () => void {
  void enableScreenshotBlock();
  return enableWebImageProtection();
}
