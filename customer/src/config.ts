import { Capacitor } from '@capacitor/core';

// On the web the app is served from the same origin as the backend (onlineppw.com
// in prod, the Vite proxy in dev), so relative '/api' and '/public' paths work as-is
// and API_BASE stays ''. Inside the native APK there is no dev proxy and the web
// bundle is served from capacitor://localhost, so every backend/media URL must be
// absolute — point it at production. Override with VITE_API_BASE if needed.
const PROD_ORIGIN = import.meta.env.VITE_API_BASE || 'https://onlineppw.com';

export const API_BASE = Capacitor.isNativePlatform() ? PROD_ORIGIN : '';

// Resolve a backend-relative path (e.g. '/api/media/items/x.webp') to something an
// <img src> can load. Absolute URLs and data/blob URIs are returned untouched.
export const mediaUrl = (u?: string | null): string => {
  if (!u) return u ?? '';
  if (/^(https?:|data:|blob:)/.test(u)) return u;
  return `${API_BASE}${u.startsWith('/') ? '' : '/'}${u}`;
};

// Download URL for the installable Android build, used by the "Install App" button
// on the login page. The GitHub Actions workflow publishes the signed APK as a
// release asset; the `releases/latest/download/...` URL always resolves to the
// newest build, so this needs no server hosting. Requires the repo to be public
// (or host the APK on onlineppw.com and override with VITE_APK_URL). See
// SETUP-MOBILE.md.
export const APK_URL =
  import.meta.env.VITE_APK_URL ||
  'https://github.com/RishabhAbs/admin-customer-ppw/releases/latest/download/PurbanchalPapers.apk';
