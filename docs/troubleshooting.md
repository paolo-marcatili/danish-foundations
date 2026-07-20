# Troubleshooting

## `Cannot find type definition file for vite/client`

Dependencies are not installed or `node_modules` is incomplete:

```bash
rm -rf node_modules apps/web/node_modules
npm install
npm run check
```

## Asset edits disappear

Edit the source-of-truth files under:

```text
asset-packs/cc0-pixel-v10/
```

Then run:

```bash
npm run assets:sync
```

Do not run a generator command after hand-editing unless you deliberately want
to overwrite those files.

## Phaser canvas jitters or changes size

- Keep the viewport preset on **Automatic** unless testing a forced layout.
- Hard-refresh after CSS updates.
- Check that the game wrapper keeps `aspect-ratio: 16 / 9`.
- Avoid browser zoom while comparing pixel positions.

## Phone cannot open the LAN development server

- Confirm both devices are on the same Wi-Fi.
- Use `npm run dev:lan`, not `npm run dev`.
- Verify the Mac address with `ipconfig getifaddr en0`.
- Allow incoming Node connections in the macOS firewall.
- Some guest Wi-Fi networks isolate devices; use another network or native
  Capacitor installation.

## Xcode signing failure

- Sign in under **Xcode > Settings > Accounts**.
- Select a Team under **Signing & Capabilities**.
- Use a unique bundle identifier.
- Keep **Automatically manage signing** enabled.
- Select a real connected device or an installed simulator runtime.

## No audio

- Tap the game once to unlock browser audio.
- Check the Settings audio mode.
- In human-only mode, audio exercises skip entries without approved human
  recordings.
- On iOS, confirm microphone permission only when recording content.

## Content importer changes a meaning unexpectedly

Open:

```text
content-packs/hy-eastern-it/sources/content-review-report.md
```

The expanded list contains draft automatic English-to-Italian sense matches.
Correct the generated item or add a manual override in
`tools/content-import/expand_hy_it_pack.py`, then rerun `npm run content:expand`.
