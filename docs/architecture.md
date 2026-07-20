# Architecture overview

Hero Language Camp separates learning content, learning mechanics, rendering,
storage, and contribution workflows so low-resource language packs can evolve
without rewriting the game.

## Runtime layers

```text
React application shell
  ├─ profiles, settings, story, shop, admin
  ├─ responsive SessionLayout
  ├─ PhaserWorld side-scroller
  └─ LabyrinthPanel isometric exploration

Learning engine
  ├─ question generation
  ├─ item memory and spaced review
  ├─ stats, caps, damage and rewards
  └─ content/tag/complexity selection

Language pack
  ├─ YAML configuration and translated interface
  ├─ JSONL vocabulary, letters and sentences
  ├─ human/automatic audio references
  └─ story and labyrinth configuration

Asset pack
  ├─ source-of-truth artwork
  └─ synchronized runtime artwork under apps/web/public

Storage adapter
  └─ localStorage today; replaceable by a future backend adapter
```

## Important source files

| Area | File |
|---|---|
| Application state machine | `apps/web/src/App.tsx` |
| Responsive device wrapper | `apps/web/src/components/layout/DeviceViewport.tsx` |
| Side-scroller/question layout | `apps/web/src/components/game/SessionLayout.tsx` |
| Phaser scene | `apps/web/src/components/PhaserWorld.tsx` |
| World tuning | `apps/web/src/worldConfig.ts` |
| Labyrinth engine/state | `apps/web/src/labyrinth.ts` |
| Labyrinth renderer | `apps/web/src/components/LabyrinthPanel.tsx` |
| Labyrinth story log | `apps/web/src/components/labyrinth/LabyrinthLog.tsx` |
| Local profiles/settings | `apps/web/src/storage.ts` |
| Pack parser/schema | `packages/content-schema/src/index.ts` |
| Learning mechanics | `packages/learning-engine/src/index.ts` |

## Responsive layout

The Phaser scene always keeps a logical 960×540, 16:9 world. CSS reserves a
stable container and scales the canvas inside it. During training/fights the
world and question panel are siblings, preventing question content from changing
the Phaser parent size.

The labyrinth uses the same principle: its camera stays mounted while the right
column or mobile Question/Story sheet changes.

## Content generation

`tools/content-import/expand_hy_it_pack.py` treats JSONL as generated output. It
preserves starter entries, rebuilds its own draft entries, merges alternative
meanings/transliterations, and writes provenance for review. The generator does
not create synthetic audio.

## Asset workflow

Edit:

```text
asset-packs/cc0-pixel-v10/
```

Then run:

```bash
npm run assets:sync
```

Runtime copies under `apps/web/public/assets/` should not be edited directly.
Generator scripts are intentionally explicit because they overwrite particular
source assets.

## Future backend boundary

Keep game code dependent on a narrow storage/content API rather than Supabase or
PocketBase directly. A future community service can provide profile sync and a
review queue while approved language packs remain versioned YAML/JSONL in Git.
