# Danish Foundations — Phase B

## Learning design

Phase B expands the Phase A vertical slice through Chapters 0–4 while preserving a pre-reader-first interaction model.

Every question now has a complete spoken Danish instruction. Listening-dependent questions wait for the first narration attempt before enabling answers and always provide a replay button. If a device voice fails, the task unlocks with a visible retry prompt rather than trapping the child.

Letter-sound work uses a familiar complete example word—such as `sol`, `lam` or `mus`—instead of asking browser speech synthesis to pronounce an isolated phoneme. Uppercase/lowercase matching remains in the pool at a lower frequency.

## Curriculum delivered

| Level | Literacy | Mathematics |
|---:|---|---|
| 0 | s, o, l, m, a; first words | quantities 0–3 and first concrete operations |
| 1 | i, n, t; short decodable words | numerals, quantities and order to 5 |
| 2 | e, r, f; family/common words | flexible counting and number matching to 5 |
| 3 | u, b, k; more short words | order, addition and subtraction to 10 |
| 4 | h, p, v; expanded word pool | compare quantities: more, fewer and equal |

The release contains 17 graphemes, 34 words and 71 structured math tasks. Each level requires several ordinary sessions but has no calendar lock.

## Narration fields

The shared `TrainingQuestion` model now supports:

- `instruction_audio_text`
- `instruction_audio`
- `auto_narrate`
- `requires_audio_before_answer`
- `auto_play_target_audio`
- separate target and secondary audio controls

These fields are optional, so the Armenian application remains compatible.

## Audio production

Run:

```bash
npm run content:audio:danish:plan
```

The Phase B neural-audio plan contains 122 files:

- 17 letter names
- 34 words
- 71 complete mathematics prompts

See `docs/DANISH_AUDIO_GENERATION.md` for the Azure/GitHub workflow. Individual phonemes are excluded from neural generation and should be short human-reviewed recordings.

## Commands

```bash
npm install
npm run check:danish
npm run dev:danish
```

GitHub Pages build:

```bash
GITHUB_PAGES=true GITHUB_PAGES_BASE=/danish-foundations/ npm run build:danish
```
