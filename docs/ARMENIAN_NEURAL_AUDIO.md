# Armenian neural audio

The canonical course can replace the legacy eSpeak previews with fixed Armenian
neural MP3 files. Fixed files are preferred because they are consistent across
devices and are included in the offline cache.

## Provider and voice

The generator defaults to the Armenian Azure Speech voice
`hy-AM-AnahitNeural` at a slightly slowed `-8%` speaking rate. You can test
`hy-AM-HaykNeural` by setting `AZURE_SPEECH_VOICE`.

## Generate a review sample first

Create an Azure Speech resource and keep its key out of Git. From the repository
root, run:

```bash
export AZURE_SPEECH_KEY="..."
export AZURE_SPEECH_REGION="westeurope"
npm run content:auto-audio -- --sample --force
```

This generates a small mix of letter names, words, and sentences. Have an
Eastern Armenian speaker review the output before replacing the whole course.

## Generate the core curriculum

```bash
export AZURE_SPEECH_KEY="..."
export AZURE_SPEECH_REGION="westeurope"
npm run content:auto-audio -- --force
```

By default, only `tier:core` content is generated. Use `--all` only after the
extension dictionary has been reviewed:

```bash
npm run content:auto-audio -- --all --force
```

The command writes MP3 files to both the source content pack and the web public
folder, then updates the JSONL audio references. Commit all generated files and
JSONL changes. Never commit the Azure key.

## Runtime fallback policy

The app prefers human recordings, then reviewed/generated neural files. A
locally installed Armenian system voice may be used before old eSpeak previews.
It never deliberately falls back to an English/default system voice.
