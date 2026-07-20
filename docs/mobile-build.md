# Mobile build notes

For family-device testing, use `docs/local-mobile-testing.md`. It covers the
recommended iPhone/Xcode workflow, quick same-Wi-Fi browser testing, and the
later Android path.

The Capacitor configuration is:

```text
capacitor.config.ts
appId: org.herolanguagecamp.app
appName: Hero Language Camp
webDir: apps/web/dist
```

Core commands:

```bash
npm install
npm run check
npm run build

# First time for a platform
npx cap add ios
npx cap add android

# After each web update
npm run mobile:sync
npm run mobile:ios
npm run mobile:android
```

The native `ios/` and `android/` directories are ignored by default in this
family prototype. Remove those `.gitignore` entries later if native code becomes
part of the maintained project.
