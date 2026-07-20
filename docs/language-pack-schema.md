# Language-pack schema

A pack represents one target/base-language pair. The default pack is Eastern
Armenian taught through Italian:

```text
content-packs/hy-eastern-it/
```

The base language is part of the pack; it is not selected independently inside
the game.

## Main files

| File | Purpose |
|---|---|
| `pack.yaml` | identity, languages, capabilities, file map, license |
| `interface.yaml` | every menu, feedback, log, and story UI string |
| `tags.yaml` | controlled semantic tags |
| `tasks.yaml` | training types, question counts, mistake rules |
| `levels.yaml` | stat caps, gates, complexity, timers |
| `enemies.yaml` | monsters, topic tags, preferred skills, rewards |
| `story.yaml` | milestones and expandable story/readings |
| `labyrinths.yaml` | maze, questions, hearts, events, treasure rewards |
| `dictionary/words.jsonl` | vocabulary and short useful phrases |
| `dictionary/letters.jsonl` | complete alphabet metadata |
| `dictionary/sentences.jsonl` | sentence-order and translation exercises |

## Vocabulary example

```json
{
  "id": "hy_word_dog",
  "concept": "dog",
  "target": "շուն",
  "translation": "cane",
  "transliteration": "shun",
  "emoji": "🐶",
  "complexity": 1,
  "tags": ["animal"],
  "audio": [],
  "source": "community",
  "source_location": "lesson-1",
  "review_status": "needs_native_speaker_review"
}
```

Optional arrays `meanings`, `transliterations`, and `aliases` retain legitimate
variants without overwriting an existing entry.

## Sentence example

```json
{
  "id": "hy_sentence_school",
  "prompt": { "it": "Scegli la frase armena: Vado a scuola." },
  "target_sentence": "Ես դպրոց եմ գնում։",
  "translation": "Vado a scuola.",
  "distractors": ["Դպրոց ես գնում եմ։"],
  "complexity": 2,
  "tags": ["school", "sentence_order"],
  "audio": [],
  "review_status": "needs_native_speaker_review"
}
```

## Validation

```bash
npm run validate:content
```

Warnings about native-speaker review are expected until content is approved.
Structural errors, duplicate IDs, missing references, and invalid labyrinth
settings must be fixed before publishing a pack.
