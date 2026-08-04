# Ord- og Talheltene — Phase C+D

Danish early-literacy and mathematics curriculum for a bilingual child beginning Danish primary school.

The child-facing language is Danish. Italian appears only as optional parent support in the chapter reader.

## Current scope

- Fourteen chapters, Levels 0–13.
- Twenty-five introduced graphemes; the less common `q`, `w`, `x`, and `z` are deferred.
- 127 picture-supported, decodable, and high-frequency words.
- 75 reading tasks across sentence-picture matching, sentence construction, missing letters, missing words, and mini-stories.
- 196 mathematics tasks across quantities, number symbols, ordering, comparison, operations, number bonds, and contextual problems.
- Numbers and operations through 20.
- Three progressively larger labyrinth configurations and fourteen reusable/scalable enemies.
- Automatic Danish narration and replay for every task.

## Review status

The original Phase B material remains as previously reviewed. New Phase C+D words, reading tasks, story chapters, and audio metadata are marked `needs_native_speaker_review`. They should be reviewed by a native Danish speaker with early-literacy experience before being marked approved.

## Regeneration

The expanded pack is generated reproducibly with:

```bash
npm run content:expand:danish
npm run check:danish
```

Browser speech is the immediate fallback. Use `tools/generate-danish-audio.mjs` to generate fixed MP3 files for letter names, words, reading prompts, and full mathematics prompts. Isolated phonemes remain reserved for reviewed human recordings.
