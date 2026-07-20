# CC0 Pixel / storybook asset pack

This folder is the source of truth for the active Phaser 2D graphics. The app
serves a generated copy from `apps/web/public/assets/pixel/`.

After changing files here, run:

```bash
npm run assets:sync
```

Do not hand-edit only the synced runtime copy: the next sync deletes and
recreates it from this folder.

## Hero animations in v0.11.0

The hero is no longer stored in one monolithic atlas. Each action is an
independent transparent 5 x 5 spritesheet:

```text
hero-walk.png             25 frames
hero-attack-simple.png    25 frames
hero-attack-swing.png     25 frames
hero-fall.png             25 frames
hero-energy-ball.png      25 frames
hero-parry.png            25 frames
hero-victory.png          25 frames
```

Every image is `1280 x 1280`; every frame is `256 x 256`. Phaser reads frames
in row-major order, from frame 0 in the upper-left to frame 24 in the
lower-right.

Standing uses frame 0 of `hero-walk.png`.

Training mappings:

```text
Strength / vocabulary  -> attack swing
Defense / comprehension -> parry
Precision / grammar    -> simple attack
Stamina / pronunciation -> energy ball
```

The original uploaded files are retained under:

```text
sources/hero-animation-sheets/
```

The importer does not change their copyright or license. Record contributor permission before redistributing them in a public asset pack.

To import a new ZIP or directory with the same seven animations:

```bash
npm run assets:import-hero -- /absolute/path/to/spritesheet.zip
npm run assets:sync
```

Or use the bundled sources:

```bash
npm run assets:import-hero-and-sync
```

The importer:

- ignores macOS `__MACOSX` files;
- validates a 5 x 5 grid and 25 non-empty frames;
- verifies that every animation uses the same square frame dimensions;
- converts files to transparent RGBA PNGs;
- aligns visible artwork to a common lower margin;
- writes `hero-animation-manifest.json`.

Keeping the actions separate avoids a 6,400-pixel-wide atlas, which can exceed
the maximum texture size of some older mobile GPUs.

## Other sprite sheets

```text
objects-small.png       64 x 64 frames
objects-large.png       256 x 256 frames
objects-front.png       96 x 96 frames
training-stations.png   96 x 96 frames
companion-dragon.png    48 x 48 frames, 6 columns x 2 rows
monsters.png            96 x 96 frames, 4 columns x 6 rows
```

## Merged contributor artwork in v0.11.6

The side-scroller sky, parallax layers, scenery objects, training stations,
hero sheets and companion sheets are the contributor-supplied files from the
latest `cc0-pixel-v10` bundle. The image-model-derived labyrinth artwork from
v0.11.5 remains in `labyrinth/`; merging a top-level asset bundle does not
remove that directory.

The far-hills and mid-hills source images have different heights from the old
placeholder pack. `apps/web/src/worldConfig.ts` now uses their actual sizes:

```text
layer-02-far-hills.png  768 x 146
layer-03-mid-hills.png  768 x 128
```

## Monster artwork

`monsters.png` is a transparent 4 x 6 spritesheet with 96 x 96 frames.

Columns:

```text
0 idle
1 hurt
2 attack
3 defeated
```

Rows:

```text
0 goblin
1 bat
2 troll
3 dragon
4 wizard
5 blob
```

The editable transparent cutouts are stored in:

```text
sources/monster-art/cutouts/
```

Regenerate the runtime sheet and sync it with:

```bash
npm run assets:generate-monsters
```

The generator adds simple, readable hit, attack and defeat variants while
keeping the source cutouts separate for future manual or image-to-image edits.

## Parallax layers

```text
layer-00-sky.png
layer-01-far-mountains.png
layer-02-far-hills.png
layer-03-mid-hills.png
layer-04-sparse-forest.png
layer-05-village-back.png
layer-06-path-ground.png
```

The renderer skips missing numbered layers.

## Generation commands

`npm run assets:generate` is a safe alias for `npm run assets:sync`.

The scenery generators may overwrite scenery PNGs, but they now re-import the
25-frame hero sheets rather than recreating the retired guide atlas:

```bash
npm run assets:generate-guides
npm run assets:generate-parallax
npm run assets:generate-realistic
```

The old guide-atlas tools remain available only through:

```bash
npm run assets:generate-legacy-hero-guides
```
