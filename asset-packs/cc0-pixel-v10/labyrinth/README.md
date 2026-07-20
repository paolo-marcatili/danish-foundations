# Labyrinth image-model asset set

These assets are the v0.11.5 semi-realistic, hand-painted enchanted-forest-ruins set used by the labyrinth renderer.

They were generated as a single image-model atlas and then normalized into the exact runtime canvases listed in `manifest.json`.

## Important geometry rules

- `floor-*`, `path-*`, and `fog.png` use a 256 × 128 isometric footprint.
- `path-00.png` through `path-15.png` use the bit mask north=1, east=2, south=4, west=8.
- Wall assets are 256 × 192.
- All assets except `map-backdrop.png` and `encounter-backdrop.png` must retain RGBA transparency.
- Keep hero, dragon, runes, monsters, traps, treasure, and decorations clear of the canvas edge.

## Regenerating from the saved model atlas

Install the optional Python dependencies:

```bash
python -m pip install -r requirements-dev.txt
```

Then run:

```bash
npm run assets:extract-labyrinth-ai
```

This extracts all 53 runtime images from:

```text
asset-packs/cc0-pixel-v10/sources/labyrinth-ai-v0115/labyrinth-ai-atlas.png
```

and mirrors them to the web runtime directory.

## Manual editing

Edit files in this directory, then run:

```bash
npm run assets:sync
```

Do not run `assets:generate-labyrinth-placeholders` after manual edits unless you intentionally want to restore the old simplified guide art.

## v0.11.7 low single-edge wall system

The four wall files now represent one edge each, not an L-shaped corner:

```text
wall-northwest.png
wall-northeast.png
wall-southwest.png
wall-southeast.png
```

All four remain 256 × 192 transparent PNGs. Their isometric edge endpoints use
this shared canvas coordinate system:

```text
north = (128, 64)
east  = (248, 128)
south = (128, 188)
west  = (8, 128)
```

Do not add a perpendicular return to an edge image. The renderer composes these
four files to represent every possible closed-wall combination and draws a dark
procedural underlay to keep the maze boundary legible.

To restore the simple low wall guides:

```bash
npm run assets:generate-labyrinth-walls
```

`assets:extract-labyrinth-ai` and `assets:generate-labyrinth-placeholders` now
run the wall generator afterward, so they cannot silently restore the old tall
corner-wall artwork.
