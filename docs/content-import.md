# Content import and review workflow

The Eastern Armenian-through-Italian pack is generated from three layers:

1. the hand-maintained starter pack;
2. family-contributed gist and redacted DOCX lesson material;
3. draft A0–A2 vocabulary matched from open-source Armenian and Italian lists.

The generated runtime files remain ordinary JSONL:

```text
content-packs/hy-eastern-it/dictionary/
  words.jsonl
  sentences.jsonl
  letters.jsonl
```

## Commands

```bash
mkdir -p content-packs/hy-eastern-it/sources/private-archive-docx
# copy the private DOCX files there, then:
npm run content:extract-docx
npm run content:expand
npm run validate:content
```

`content:expand` is idempotent: it preserves starter entries, removes its own
previously generated draft entries, then rebuilds them from the source files.

## Provenance fields

Draft entries may contain:

```json
{
  "source": "shay-ellison-armenian-words-mit",
  "source_location": "eng_arm.csv:42",
  "notes": "Italian meaning matched automatically...",
  "review_status": "needs_native_speaker_review"
}
```

Alternative meanings and transliterations are merged into `meanings` and
`transliterations` arrays instead of creating duplicate words.

## Review report

Open:

```text
content-packs/hy-eastern-it/sources/content-review-report.md
```

It lists missing translations and a bounded set of automatic sense matches that
should be checked. A reviewer should prioritize level-1/2 content, audio-linked
items, and words selected by early monsters.

## Audio

The importer does not create automated audio. Human recordings can be appended
through the in-app dictionary editor. Existing recordings are never overwritten.
