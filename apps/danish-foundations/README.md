# Ord- og Talheltene

Danish early-literacy and mathematics application covering the language and mathematical portions of børnehaveklasse and an introductory early-1.-klasse extension.

The child-facing interface is Danish. Italian is available as optional parent support in the chapter reader.

## Current scope

- Fourteen chapters and levels, numbered 0–13.
- Twenty-five early-school graphemes; `q`, `w`, `x`, and `z` remain outside the introductory sequence.
- 127 picture-supported and high-frequency words.
- 75 structured reading tasks: sentence-to-picture, sentence order, missing letters, missing words, and mini-stories.
- 196 mathematics tasks: counting, numeral matching, ordering, comparison, addition, subtraction, number bonds, and story problems.
- Numbers and operations through 20.
- Three labyrinth bands and fourteen scalable enemies.
- Parent progress summary.
- Narrated Danish tasks and replay controls.
- Separate offline and GitHub Pages deployment from the Armenian application.

New Danish content is marked for native-speaker/teacher review until approved.

## Run locally

From the repository root:

```bash
npm install
npm run check:danish
npm run dev:danish
```

Open `http://127.0.0.1:5174/`.

## Build

```bash
GITHUB_PAGES=true GITHUB_PAGES_BASE=/danish-foundations/ npm run build:danish
```

The production output is written to `apps/danish-foundations/dist`.

## Rebuild the generated Phase C+D curriculum

```bash
npm run content:expand:danish
npm run check:danish
```

The generator is deterministic and preserves browser-compatible YAML formatting.

See `docs/DANISH_FOUNDATIONS_PHASE_CD.md` for the curriculum and implementation notes and `docs/DANISH_AUDIO_GENERATION.md` for fixed neural audio generation.
