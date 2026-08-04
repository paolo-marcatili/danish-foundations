#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadModularPack, parseJsonl, writeJsonl } from "./pack-utils.mjs";

const target = resolve(process.argv[2] ?? "content-packs/da-foundations");
if (!statSync(target).isDirectory()) throw new Error("Expected the Danish foundations content-pack directory.");

const args = new Set(process.argv.slice(3));
const planOnly = args.has("--plan");
const sampleOnly = args.has("--sample");
const force = args.has("--force");
const key = process.env.AZURE_SPEECH_KEY;
const region = process.env.AZURE_SPEECH_REGION;
const voice = process.env.AZURE_SPEECH_VOICE || "da-DK-ChristelNeural";
const rate = process.env.AZURE_SPEECH_RATE || "-6%";
const endpoint = process.env.AZURE_SPEECH_ENDPOINT || `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

const pack = loadModularPack(target);
const files = pack.files || {};
const paths = {
  words: join(target, files.words || "dictionary/words.jsonl"),
  letters: join(target, files.letters || "dictionary/letters.jsonl"),
  math: join(target, files.math_problems || "curriculum/math-problems.jsonl")
};
const collections = {
  words: parseJsonl(readFileSync(paths.words, "utf8")),
  letters: parseJsonl(readFileSync(paths.letters, "utf8")),
  math: parseJsonl(readFileSync(paths.math, "utf8"))
};

let queue = [
  ...collections.letters.map((entry) => ({ entry, id: entry.id, kind: "letter-name", text: getLetterName(entry), field: "audio" })),
  ...collections.words.map((entry) => ({ entry, id: entry.id, kind: "word", text: entry.target, field: "audio" })),
  ...collections.math.map((entry) => ({ entry, id: entry.id, kind: "math-prompt", text: entry.prompt?.da, field: "audio" }))
].filter((item) => item.text && item.entry.tags?.includes("tier:core"));

if (sampleOnly) {
  queue = [
    ...queue.filter((item) => item.kind === "letter-name").slice(0, 5),
    ...queue.filter((item) => item.kind === "word").slice(0, 8),
    ...queue.filter((item) => item.kind === "math-prompt").slice(0, 8)
  ];
}

const counts = queue.reduce((result, item) => ({ ...result, [item.kind]: (result[item.kind] ?? 0) + 1 }), {});
console.log(`Danish audio plan: ${queue.length} files (${counts["letter-name"] ?? 0} letter names, ${counts.word ?? 0} words, ${counts["math-prompt"] ?? 0} math prompts).`);
console.log("Isolated phonemes are intentionally excluded; use reviewed human recordings for those.");
if (planOnly) process.exit(0);
if (!key || !region) {
  console.error("Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION before generating Danish neural audio.");
  console.error("Run `npm run content:audio:danish:plan` to inspect the exact scope without credentials.");
  process.exit(2);
}

const sourceDir = join(target, "audio", "auto-neural");
const publicDir = join("apps", "danish-foundations", "public", "content-packs", pack.pack_id, "audio", "auto-neural");
mkdirSync(sourceDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });

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
  replaceGeneratedAudio(item, fileName);
}
process.stdout.write("\n");

writeFileSync(paths.letters, writeJsonl(collections.letters));
writeFileSync(paths.words, writeJsonl(collections.words));
writeFileSync(paths.math, writeJsonl(collections.math));
console.log(`Danish neural audio metadata updated for ${queue.length} entries using ${voice}.`);

async function synthesize(text) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "danish-foundations-audio-generator"
    },
    body: `<speak version="1.0" xml:lang="da-DK"><voice name="${escapeXml(voice)}"><prosody rate="${escapeXml(rate)}">${escapeXml(normalizeText(text))}</prosody></voice></speak>`
  });
  if (!response.ok) throw new Error(`Azure Speech ${response.status}: ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
}

function replaceGeneratedAudio(item, fileName) {
  const current = Array.isArray(item.entry[item.field]) ? item.entry[item.field] : [];
  const preserved = current.filter((audio) => audio.source_type === "human" || audio.source_type === "browser_tts");
  item.entry[item.field] = [{
    id: `${item.id}_azure_neural`,
    url: `/content-packs/${pack.pack_id}/audio/auto-neural/${fileName}`,
    speaker_label: `Azure ${voice} Danish neural voice`,
    source_type: "automated",
    engine: "Azure AI Speech",
    provider: "Microsoft Azure",
    voice,
    text: item.text,
    mime_type: "audio/mpeg",
    generated_at: new Date().toISOString(),
    license: "generated-for-project-use-review-provider-terms",
    review_status: "draft"
  }, ...preserved];
}

function getLetterName(entry) {
  return String(entry.spoken_name || entry.names?.da || entry.character || "").trim();
}
function normalizeText(text) { return String(text).replace(/\s+/g, " ").trim(); }
function escapeXml(text) { return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }
