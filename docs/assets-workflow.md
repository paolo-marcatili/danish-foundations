# Asset workflow

The app serves Phaser assets from:

```text
apps/web/public/assets/pixel/
```

Do not treat that folder as the main editing location. It is a synced runtime copy.
The source-of-truth asset pack is:

```text
asset-packs/cc0-pixel-v10/
```

## Normal artist workflow

1. Edit or replace PNG files in `asset-packs/cc0-pixel-v10/`.
2. Run:

```bash
npm run assets:sync
```

3. Restart or hard-refresh the dev app.

This copies the current source pack into the Vite-served runtime folder.

## Important: do not use the placeholder generator for hand-edited art

`npm run assets:generate` is now a safe alias for `npm run assets:sync`.

The procedural placeholder generator is explicit:

```bash
npm run assets:generate-parallax
```

That command regenerates the current placeholder side-scroller pack and can overwrite hand-edited source assets. Use it only when you intentionally want to recreate the generated placeholder pack.

## Current sprite dimensions

```text
hero-walk.png: 256x256 frames, 5 columns x 5 rows
hero-attack-simple.png: 256x256 frames, 5 columns x 5 rows
hero-attack-swing.png: 256x256 frames, 5 columns x 5 rows
hero-fall.png: 256x256 frames, 5 columns x 5 rows
hero-energy-ball.png: 256x256 frames, 5 columns x 5 rows
hero-parry.png: 256x256 frames, 5 columns x 5 rows
hero-victory.png: 256x256 frames, 5 columns x 5 rows
companion-dragon.png: 48x48 frames, 6 columns x 2 rows
monsters.png: 48x48 frames
objects-large.png: 256x256 frames
objects-small.png: 64x64 frames
objects-front.png: 96x96 frames
training-stations.png: 96x96 frames
```

The hero is baked into every action sheet with sword, shield, light armor and
green cape. There are no active equipment overlay sheets. Standing uses frame
0 of the walking sheet.

Sprite paths, frame rates and training mappings live in:

```text
apps/web/src/worldConfig.ts
```

The Phaser scene loads every hero sheet independently in:

```text
apps/web/src/components/PhaserWorld.tsx
```

## Importing hero animation sheets

The bundled source sheets are in:

```text
asset-packs/cc0-pixel-v10/sources/hero-animation-sheets/
```

Rebuild them with:

```bash
npm run assets:import-hero-and-sync
```

Import a replacement ZIP or directory with:

```bash
npm run assets:import-hero -- /absolute/path/to/spritesheet.zip
npm run assets:sync
```

Each input file must be a transparent 5 x 5 grid with 25 square frames. The
importer validates the sheets, normalizes the lower margin, standardizes the
filenames and writes `hero-animation-manifest.json`.

## Legacy hero generators

The older procedural guide-atlas scripts are retained for reference but are no
longer part of the active runtime. Run them only explicitly:

```bash
npm run assets:generate-legacy-hero-guides
```

The scenery guide generators re-import the current 25-frame hero sheets after
regenerating scenery, so they do not replace the active hero with the legacy
atlas.

## Asset-license note

Keep committed art permissive and open-source friendly. Prefer original project art, CC0 assets, or assets with clear redistribution permission. Avoid committing commercial marketplace source files unless their license explicitly allows open redistribution.

## Realistic-style scenery generator

v0.10.5 also adds a more detailed, DALL-E-inspired scenery/object generator:

```bash
npm run assets:generate-realistic
```

This overwrites the parallax layer PNGs and object atlases in `asset-packs/cc0-pixel-v10/`, then runs `assets:sync`. Use this when you intentionally want to regenerate the current realistic-style scenery. Do not use it after hand-editing those files unless you want to replace your edits.
