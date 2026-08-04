# Danish Foundations Phase E

Phase E extends the 14-chapter Danish foundations course without changing saved level numbers.

## Child experience

- Every task narrates itself automatically.
- Auditory tasks play the instruction and target once as a single sequence.
- Visual tasks remain answerable while narration plays.
- One optional `Hør igen` button repeats the complete task.
- Correct answers do not replay the target automatically.
- Incorrect answers play the correct target once with feedback.

## New content

- 209 staged words.
- 156 reading and phonological-awareness tasks.
- 246 mathematics tasks.
- Initial sound, final sound, rhyme and syllable-count activities.
- Shapes, repeating patterns, sorting and measurement activities.
- Additional mini-stories and comprehension questions.
- 23 reusable Danish instruction recordings/voice prompts.

## Audio workflow

The neural-audio plan contains 686 files: reusable instructions, letter names, words,
math prompts, reading targets and mini-story questions. Isolated phonemes remain excluded
and should use reviewed human recordings.

Generate audio through the GitHub Actions workflow, extract the artifact, and run:

```bash
npm run content:audio:danish:integrate -- /path/to/extracted/danish-audio-update
npm run content:sync-danish
npm run check:danish
```

See `docs/DANISH_AUDIO_GENERATION.md` for the complete procedure.
