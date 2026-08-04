# Danish neural audio generation

The Phase B app works immediately with an installed Danish browser voice. For consistent pronunciation and reliable offline playback, generate fixed Danish neural MP3 files after reviewing a small sample.

## What the generator covers

The default `core` scope includes:

- all introduced Danish letter **names**;
- all staged Danish words;
- the complete spoken prompts for structured mathematics problems.

It deliberately does **not** synthesize isolated phonemes such as `/s/` or `/m/`. Speech engines often turn isolated phonemes into letter names or unnatural sounds. Those should be short human recordings reviewed by a Danish early-literacy teacher.

Inspect the exact number of planned files without using an Azure credential:

```bash
npm run content:audio:danish:plan
```

For the smaller review sample:

```bash
node tools/generate-danish-audio.mjs content-packs/da-foundations --plan --sample
```

## Generate through GitHub Actions

1. In Azure, create an Azure AI Speech resource.
2. Copy the resource key and region identifier.
3. In the GitHub repository open **Settings → Secrets and variables → Actions**.
4. Add repository secrets named:
   - `AZURE_SPEECH_KEY`
   - `AZURE_SPEECH_REGION`
5. Open **Actions → Generate Danish neural audio → Run workflow**.
6. Run `sample` first, normally with `da-DK-ChristelNeural` at `-6%`.
7. Download the `danish-neural-audio-sample` artifact.
8. Extract it into the repository root and review it with a native Danish speaker.
9. After approval, run the workflow again with `core`.
10. Extract the core artifact, run `npm run check:danish`, commit, and push.

The next Danish Pages build automatically includes the generated MP3 files in its offline audio package.

## Generate locally

Set the credentials in the current shell:

```bash
export AZURE_SPEECH_KEY="..."
export AZURE_SPEECH_REGION="westeurope"
export AZURE_SPEECH_VOICE="da-DK-ChristelNeural"
export AZURE_SPEECH_RATE="-6%"
```

Generate a sample:

```bash
node tools/generate-danish-audio.mjs content-packs/da-foundations --sample --force
```

Generate the full staged set:

```bash
node tools/generate-danish-audio.mjs content-packs/da-foundations --force
```

Validate and build:

```bash
npm run check:danish
GITHUB_PAGES=true GITHUB_PAGES_BASE=/danish-foundations/ npm run build:danish
```

## Review checklist

Review at least:

- every letter name;
- vowel quality in short words;
- Danish stød where relevant;
- compound and function words;
- number words and arithmetic sentences;
- question intonation;
- whether `-6%` sounds clear without becoming unnaturally slow.

Keep generated entries marked `draft` until pronunciation has been reviewed. Human recordings are preserved when the generator updates metadata.
