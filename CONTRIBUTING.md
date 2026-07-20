# Contributing

Thanks for helping build learning tools for languages that are often underserved by commercial platforms.

## Contribution paths

### Language contributors

You can contribute words, translations, example phrases, images, and audio. Please mark the dialect/variety and script conventions clearly.

### Native-speaker reviewers

Reviewers should check:

- spelling and orthography;
- dialect/variety labels;
- naturalness for children;
- whether translations are too literal or misleading;
- whether examples are safe and age-appropriate.

### Developers

Please keep these boundaries intact:

- Learning content should not depend on one specific game renderer.
- Game rendering should consume learning events, not language-specific logic.
- AI and speech providers should be optional adapters, not required for a language to work.

## Content licensing

Every content pack must include its own `LICENSE.md`. Do not add dictionary data, images, recordings, or generated assets unless the license allows redistribution.

## Review status

New content should start as:

```json
"review_status": "needs_native_speaker_review"
```

It should only become `approved` after community review.
