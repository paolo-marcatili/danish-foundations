#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadModularPack, parseJsonl, writeJsonl } from "./pack-utils.mjs";

const args = new Set(process.argv.slice(3));
const force = args.has("--force");
const allContent = args.has("--all");
const sampleOnly = args.has("--sample");
const target = resolve(process.argv[2] ?? "content-packs/hy-eastern-it");
if (!statSync(target).isDirectory()) throw new Error("Expected a modular content-pack directory.");

const key = process.env.AZURE_SPEECH_KEY;
const region = process.env.AZURE_SPEECH_REGION;
const voice = process.env.AZURE_SPEECH_VOICE || "hy-AM-AnahitNeural";
const rate = process.env.AZURE_SPEECH_RATE || "-8%";
const endpoint = process.env.AZURE_SPEECH_ENDPOINT || `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
if (!key || !region) {
  console.error("Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION before generating neural Armenian audio.");
  console.error("Example: AZURE_SPEECH_REGION=westeurope AZURE_SPEECH_KEY=... npm run content:auto-audio -- --force");
  process.exit(2);
}

const pack = loadModularPack(target);
const packSlug = pack.pack_id;
const sourceDir = join(target, "audio", "auto-neural");
const publicDir = join("apps", "web", "public", "content-packs", packSlug, "audio", "auto-neural");
mkdirSync(sourceDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });

const files = pack.files || {};
const paths = {
  words: join(target, files.words || "dictionary/words.jsonl"),
  letters: join(target, files.letters || "dictionary/letters.jsonl"),
  sentences: join(target, files.sentences || "dictionary/sentences.jsonl")
};
const collections = {
  words: parseJsonl(readFileSync(paths.words, "utf8")),
  letters: parseJsonl(readFileSync(paths.letters, "utf8")),
  sentences: parseJsonl(readFileSync(paths.sentences, "utf8"))
};

let queue = [
  ...collections.words.map((entry) => ({ entry, id: entry.id, text: entry.target, kind: "word" })),
  ...collections.sentences.map((entry) => ({ entry, id: entry.id, text: entry.target_sentence, kind: "sentence" })),
  ...collections.letters.map((entry) => ({ entry, id: entry.id, text: getLetterName(entry), kind: "letter" }))
].filter(({ entry }) => allContent || entry.tags?.includes("tier:core"));

if (sampleOnly) {
  const chosen = [];
  for (const kind of ["letter", "word", "sentence"]) {
    chosen.push(...queue.filter((item) => item.kind === kind).slice(0, kind === "sentence" ? 10 : 8));
  }
  queue = chosen;
}

let generated = 0;
for (const item of queue) {
  const fileName = `${item.id}.mp3`;
  const sourcePath = join(sourceDir, fileName);
  const publicPath = join(publicDir, fileName);
  if (force || !existsSync(sourcePath)) {
    const bytes = await synthesize(item.text);
    writeFileSync(sourcePath, bytes);
    generated += 1;
    process.stdout.write(`\rGenerated ${generated}/${queue.length}: ${item.id}          `);
  }
  copyFileSync(sourcePath, publicPath);
  replaceGeneratedAudio(item.entry, item.id, item.text, fileName);
}
process.stdout.write("\n");

writeFileSync(paths.words, writeJsonl(collections.words));
writeFileSync(paths.letters, writeJsonl(collections.letters));
writeFileSync(paths.sentences, writeJsonl(collections.sentences));
console.log(`Neural Armenian audio ready for ${queue.length} core entries using ${voice}.`);

async function synthesize(text) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "hero-language-camp-audio-generator"
    },
    body: `<speak version="1.0" xml:lang="hy-AM"><voice name="${escapeXml(voice)}"><prosody rate="${escapeXml(rate)}">${escapeXml(normalizeText(text))}</prosody></voice></speak>`
  });
  if (!response.ok) throw new Error(`Azure Speech ${response.status}: ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
}

function replaceGeneratedAudio(entry, id, text, fileName) {
  const preserved = (entry.audio || []).filter((audio) => audio.source_type === "human");
  entry.audio = [{
    id: `${id}_azure_neural`,
    url: `/content-packs/${packSlug}/audio/auto-neural/${fileName}`,
    speaker_label: `Azure ${voice} Armenian neural voice`,
    source_type: "automated",
    engine: "Azure AI Speech",
    provider: "Microsoft Azure",
    voice,
    text,
    mime_type: "audio/mpeg",
    generated_at: new Date().toISOString(),
    license: "generated-for-project-use-review-provider-terms",
    review_status: "draft"
  }, ...preserved];
}

function getLetterName(entry) {
  const label = entry.names?.it || entry.names?.en || entry.character;
  return String(label).split("·")[0].trim() || entry.character;
}
function normalizeText(text) { return String(text).replace(/[։:;]+/g, ".").replace(/\s+/g, " ").trim(); }
function escapeXml(text) { return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }
