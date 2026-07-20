# Side-scroller monster source art

This folder contains the source material used to build the runtime
`monsters.png` sheet.

```text
monster-concept-source.png  image-model concept contact sheet
cutouts/goblin.png          transparent source cutout
cutouts/bat.png
cutouts/troll.png
cutouts/dragon.png
cutouts/wizard.png
cutouts/blob.png
monsters-preview.png        checkerboard preview of the generated sheet
```

The runtime sheet is generated with:

```bash
npm run assets:generate-monsters
```

The generator does not synthesize new art. It scales the six transparent source
cutouts into the required 96 x 96 cells and creates readable variants for idle,
hurt, attack and defeated states.

To improve a monster later, replace only its transparent cutout while preserving
roughly the same facing direction and ground contact point, then rerun the
command.
