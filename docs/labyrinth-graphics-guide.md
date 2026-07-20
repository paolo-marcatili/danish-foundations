# Labyrinth graphics guide

The runtime files below are simplified placeholders designed for image-to-image refinement.

## Shared style prompt

> Semi-realistic hand-painted fantasy RPG isometric map asset, enchanted forest ruins, lush moss and roots, warm storybook colors, soft painterly brushwork, naturalistic warm lighting, clear child-friendly silhouette, detailed natural texture without visual clutter. Preserve the exact canvas size, object position and transparent background. Do not add text, labels, borders, watermarks or extra objects.

## Critical rules

- Keep every filename unchanged.
- Keep the exact canvas dimensions.
- Keep transparency for every object/tile asset.
- `map-backdrop.png` and `encounter-backdrop.png` may remain opaque.
- Keep isometric floor and fog assets as a 2:1 diamond.
- Keep all tokens away from canvas edges.
- Do not add shadows outside the canvas.
- Do not combine assets into a contact sheet.

## Files to refine

| File | Size | Format | Content |
|---|---:|---|---|
| `floor-01.png` | 256×128 | transparent PNG | Isometric mossy-stone/earth floor tile, variant 1 |
| `floor-02.png` | 256×128 | transparent PNG | Isometric floor tile, variant 2 |
| `floor-03.png` | 256×128 | transparent PNG | Isometric floor tile, variant 3 |
| `path-00.png` … `path-15.png` | 256×128 each | transparent PNG | Sixteen isometric path-connection overlays. Preserve the bit-mask connection pattern: north=1, east=2, south=4, west=8. Each file must connect cleanly to the corresponding diamond-edge midpoints. |
| `fog.png` | 256×128 | transparent PNG | Soft magical mist fitting one isometric tile |
| `wall-northwest.png` | 256×192 | transparent PNG | Low ruined wall/hedge along the northwest edge |
| `wall-northeast.png` | 256×192 | transparent PNG | Low ruined wall/hedge along the northeast edge |
| `wall-southwest.png` | 256×192 | transparent PNG | Low ruined wall/hedge along the southwest edge |
| `wall-southeast.png` | 256×192 | transparent PNG | Low ruined wall/hedge along the southeast edge |
| `hero.png` | 128×128 | transparent PNG | Three-quarter isometric hero, sword, shield and green cape |
| `dragon.png` | 96×96 | transparent PNG | Cute three-quarter isometric red dragon companion |
| `entrance.png` | 128×128 | transparent PNG | Mossy ruin entrance/archway |
| `rune-vocabulary.png` | 128×128 | transparent PNG | Strength/vocabulary rune shrine |
| `rune-comprehension.png` | 128×128 | transparent PNG | Defense/comprehension rune shrine |
| `rune-grammar.png` | 128×128 | transparent PNG | Precision/grammar rune shrine |
| `rune-pronunciation.png` | 128×128 | transparent PNG | Stamina/pronunciation rune shrine |
| `monster-01.png` | 192×192 | transparent PNG | Friendly forest goblin/imp encounter |
| `monster-02.png` | 192×192 | transparent PNG | Friendly magical bat/spirit encounter |
| `monster-03.png` | 192×192 | transparent PNG | Friendly plant/mushroom monster encounter |
| `guardian.png` | 256×256 | transparent PNG | Larger child-friendly dragon guardian |
| `trap-01.png` | 128×128 | transparent PNG | Thorny roots or carnivorous plant trap |
| `trap-02.png` | 128×128 | transparent PNG | Crumbling floor or stone-spike trap |
| `trap-03.png` | 128×128 | transparent PNG | Spider-web trap |
| `trap-04.png` | 128×128 | transparent PNG | Poison mushroom trap |
| `cache-closed.png` | 128×128 | transparent PNG | Closed adventurer cache/chest |
| `cache-open.png` | 128×128 | transparent PNG | Same cache opened with coins visible |
| `healing-fountain.png` | 128×128 | transparent PNG | Small magical healing fountain |
| `reveal-obelisk.png` | 128×128 | transparent PNG | Glowing map-reveal obelisk |
| `treasure-locked.png` | 128×128 | transparent PNG | Final locked treasure chest |
| `treasure-open.png` | 128×128 | transparent PNG | Final open treasure chest |
| `decoration-01.png` | 96×96 | transparent PNG | Roots/vines decoration |
| `decoration-02.png` | 96×96 | transparent PNG | Broken column decoration |
| `decoration-03.png` | 96×96 | transparent PNG | Mushroom patch decoration |
| `decoration-04.png` | 96×96 | transparent PNG | Fern decoration |
| `decoration-05.png` | 96×96 | transparent PNG | Small ruin decoration |
| `decoration-06.png` | 96×96 | transparent PNG | Fireflies/magical lights decoration |
| `map-backdrop.png` | 1280×720 | opaque PNG | Warm forest-ruins landscape behind the map |
| `encounter-backdrop.png` | 1024×360 | opaque PNG | Side-view forest-ruins encounter background |

## Path-overlay naming

The sixteen `path-NN.png` files represent every combination of open maze exits. The numeric suffix is a four-bit mask:

```text
north = 1
east  = 2
south = 4
west  = 8
```

Examples:

```text
path-00.png  no exits / small clearing
path-03.png  north + east
path-05.png  north + south
path-10.png  east + west
path-15.png  all four exits
```

When refining these through an image model, process them as a coordinated set. Keep the path width and the four diamond-edge connection points identical in every file; otherwise adjacent cells will no longer join visually.

The generated asset manifest with machine-readable dimensions is:

```text
asset-packs/cc0-pixel-v10/labyrinth/manifest.json
```
