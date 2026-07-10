# PurbanchalPapers — Android APK + OTA (live updates)

This documents the mobile build for the **customer** app (`com.purbanchal.papers`).

## Important: EAS does not apply here

This is a **Capacitor** app, not Expo/React Native. **EAS (Expo Application Services)
cannot build or update it.** The Capacitor equivalent of "EAS Update" is **Capgo**,
which is what's wired in: push a new web build and every installed app auto-updates on
next launch — no Play Store, no reinstall.

- **OTA (web/JS/CSS/HTML changes)** → delivered instantly via Capgo. Most changes.
- **Native changes** (new Capacitor plugin, `capacitor.config.ts`, Android permissions,
  app icon, min SDK) → require a **new APK** build + reinstall.

## What's already done in code

| Area | File |
|------|------|
| Native-aware API base + media URL resolution (APK hits `https://onlineppw.com`) | `src/config.ts`, `src/api.ts` |
| Capgo live-update SDK + `notifyAppReady()` bootstrap | `src/updater.ts`, `src/main.tsx` |
| Capgo `autoUpdate` + rollback config | `capacitor.config.ts` |
| Android native project | `android/` |
| "Install Android App" button on the login page (web only) | `src/pages/Login.tsx` |
| CI: build → signed APK → GitHub Release → Capgo bundle push | `.github/workflows/android.yml` |

The install button links to `releases/latest/download/PurbanchalPapers.apk`, which always
serves the newest CI build. Override with `VITE_API_BASE` / `VITE_APK_URL` at build time.

---

## One-time setup you must do (needs your accounts/secrets)

### 1. Generate a release signing keystore
Run locally (keep the `.jks` file safe and backed up — losing it means you can't ship
updates to already-installed apps):
```bash
keytool -genkey -v -keystore ppw-release.jks -keyalg RSA -keysize 2048 \
  -validity 10000 -alias ppw
# then base64-encode it for the GitHub secret:
base64 -w0 ppw-release.jks    # (macOS: base64 -i ppw-release.jks)
```

### 2. Create a Capgo app + token
```bash
npx @capgo/cli@latest login <YOUR_CAPGO_API_TOKEN>
npx @capgo/cli@latest app add com.purbanchal.papers
npx @capgo/cli@latest channel add production com.purbanchal.papers --default
```
Get the API token from https://web.capgo.app → Account → API Keys. Capgo has a free tier;
it can also be self-hosted if you prefer.

### 3. Add GitHub Actions secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|--------|-------|
| `ANDROID_KEYSTORE_BASE64` | output of the `base64` command above |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password you chose |
| `ANDROID_KEY_ALIAS` | `ppw` (the alias) |
| `ANDROID_KEY_PASSWORD` | key password you chose |
| `CAPGO_TOKEN` | Capgo API token (optional — OTA step is skipped if absent) |

### 4. Make sure the APK download URL works
The install button uses `https://github.com/RishabhAbs/admin-customer-ppw/releases/latest/download/PurbanchalPapers.apk`.
- If the repo is **public**, this works as-is.
- If **private**, GitHub release assets need auth — instead host the APK on your server
  (e.g. `https://onlineppw.com/downloads/PurbanchalPapers.apk`) and rebuild the web app
  with `VITE_APK_URL=https://onlineppw.com/downloads/PurbanchalPapers.apk`.

---

## Building the APK

**Via CI (recommended):** push to `main` (touching `customer/**`) or run the
**Build Android APK + Capgo OTA** workflow manually (Actions tab → Run workflow). It
produces a signed APK, publishes it as a release, and pushes the Capgo bundle.

**Locally (optional):** requires JDK 17 + Android SDK/Android Studio.
```bash
cd customer
npm ci && npm run build
npx cap sync android
npx cap open android      # then Build > Generate Signed Bundle/APK in Android Studio
```

## How updates flow after setup

1. You change customer web code and merge to `main`.
2. CI builds, publishes a new APK release, and runs `capgo bundle upload`.
3. Installed apps pick up the new web bundle from Capgo on next launch (auto).
4. Only when you change **native** bits do users need the new APK (install button).

## Verifying OTA
Install the APK, then push a small visible web change and let CI run. Cold-start the app
twice (first launch downloads the bundle, second applies it) and confirm the change shows
without reinstalling. `npx @capgo/cli bundle list com.purbanchal.papers` shows uploads.
