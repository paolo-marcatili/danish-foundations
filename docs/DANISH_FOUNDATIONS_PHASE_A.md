# Danish Foundations — Phase A

## Scope delivered

This vertical slice proves that the existing game framework can host a non-translation learning domain.

It includes:

- A separate application and storage namespace.
- A separate `da-foundations` content pack.
- A foundations engine compatible with the existing training, fight, stone, and labyrinth shells.
- Five graphemes: `s`, `o`, `l`, `m`, and `a`.
- Two first reading words: `sol` and `lam`.
- Letter-sound selection and uppercase/lowercase matching.
- Picture-to-word matching and letter-tile word building.
- Counting, numeral/quantity matching, and missing-number activities from 0 to 5.
- Addition and subtraction with visible objects.
- One bilingual Danish/Italian chapter.
- One reusable enemy and one 12–16-question labyrinth.
- Danish browser speech for letters, words, and instructions.
- Separate offline cache namespace and a GitHub Pages base of `/danish-foundations/`.

## Architecture

```text
apps/danish-foundations/         Danish application
packages/foundations-engine/     Literacy and math question generation
content-packs/da-foundations/    Curriculum and child-facing content
packages/content-schema/         Extended with structured math problems
```

The Armenian app remains under `apps/web` and continues to use `@hero-lang/learning-engine`.

## Exercise mapping

| Shared focus | Danish domain | Phase A exercises |
|---|---|---|
| vocabulary | Bogstaver | Hear a sound and choose a letter; match uppercase/lowercase |
| comprehension | Ord og læsning | Match image to word; build a word from letter tiles |
| grammar | Tal og tælling | Count objects; match numeral and quantity; missing number |
| pronunciation | Plus og minus | Addition and subtraction with objects |

The names of the shared focus identifiers are currently retained internally for compatibility with profiles, stones, combat, and labyrinth code. They are never shown to the child; the pack supplies Danish labels. A later extraction can replace these identifiers with domain-neutral names without blocking curriculum development.

## Content limitations

This is a technical prototype, not yet a complete or classroom-validated course. In particular:

- The five-letter sequence and first word set need review by an early-literacy specialist.
- Browser speech is used for the prototype; isolated phonemes should eventually use reviewed human recordings.
- Mathematics uses tap-based representations. Drag-and-drop manipulatives belong in the next implementation phase.
- Parent-facing Italian help is currently concentrated in the chapter and content records rather than a complete parent dashboard.

## Next recommended milestone

Expand Chapters 0–4 with a reviewed grapheme sequence, 30–50 decodable words, quantities and number order to 10, child-tested images, and reviewed Danish audio.
