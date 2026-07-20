# Test on family phones

The fastest path for your current setup is iPhone/iPad through Capacitor and
Xcode. Android remains available later after installing Android Studio.

## A. Quick browser test on the same Wi-Fi

On the Mac:

```bash
npm install
npm run dev:lan
```

Find the Mac Wi-Fi address:

```bash
ipconfig getifaddr en0
```

Open this on the phone, replacing the address:

```text
http://192.168.1.25:5173
```

This is useful for immediate layout and gameplay testing. Keep the terminal
running. Browser microphone/audio behavior may differ from the native app.

## B. iPhone/iPad native install with Xcode

### First time only

```bash
npm install
npm run check
npm run build
npx cap add ios
```

### After each web change

```bash
npm run mobile:sync
npm run mobile:ios
```

Xcode opens the generated workspace.

1. Connect the iPhone/iPad by cable. Accept **Trust this computer**.
2. In Xcode, open **Xcode > Settings > Accounts** and sign in with your Apple
   Account.
3. Select the `App` project, then **Signing & Capabilities**.
4. Leave **Automatically manage signing** enabled and choose your Personal Team
   or development team.
5. Keep the bundle identifier `org.herolanguagecamp.app`. If Xcode says it is
   unavailable, use a unique local suffix such as
   `org.herolanguagecamp.paolo` and apply the same value in
   `capacitor.config.ts`.
6. Add this key to `ios/App/App/Info.plist` if it is not present:

   ```xml
   <key>NSMicrophoneUsageDescription</key>
   <string>Record Armenian words and sentences for the family dictionary.</string>
   ```

7. Choose the connected device as the run destination.
8. Press the Play button.
9. If iOS asks, enable Developer Mode and trust the developer profile.

A free personal Apple account is sufficient for local development signing, but
those installs can require periodic re-signing. No App Store or TestFlight setup
is needed for family-device testing.

## C. iOS Simulator

```bash
npm run mobile:ios
```

Choose an iPhone simulator in Xcode and press Run. The simulator is useful for
layout checks. Test sound, performance, recording, and app resume on a real
phone before handing it to a child.

## D. Android later

Install Android Studio and its SDK, then:

```bash
npx cap add android
npm run mobile:sync
npm run mobile:android
```

Choose a connected Android phone or emulator and press Run in Android Studio.
No Play Store account is required for this local installation.

## E. Update an already installed native app

```bash
npm run check
npm run mobile:sync
npm run mobile:ios       # or mobile:android
```

Build/Run again from Xcode or Android Studio. Local profiles normally remain on
the device as long as the app identifier does not change and the app is not
deleted.

## F. Mobile acceptance checklist

- Select a profile and close/reopen the app; progress remains.
- Start training and fight without page-level scrolling.
- Test portrait and landscape.
- Open the labyrinth and switch between **Domanda** and **Storia**.
- Test arrow controls with a hardware keyboard and touch controls on screen.
- Confirm human-only audio does not select entries without human recordings.
- Record a dictionary entry and replay it.
- Interrupt the app during a labyrinth and resume it.
- Ensure Debug bypass is off before giving the phone to a child.
