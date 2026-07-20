#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadModularPack, parseJsonl, writeJsonl } from "./pack-utils.mjs";

const target = resolve(process.argv[2] ?? "content-packs/hy-eastern-it");
const isDir = statSync(target).isDirectory();
if (!isDir) {
  console.error("v0.7 automated audio expects a modular pack directory, e.g. content-packs/hy-eastern-it");
  process.exit(1);
}
const pack = loadModularPack(target);
const packSlug = pack.pack_id;
const sourceDir = join(target, "audio", "auto");
const publicDir = join("apps", "web", "public", "content-packs", packSlug, "audio", "auto");
mkdirSync(sourceDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });

const speechBinary = findSpeechBinary();
const speechVoice = process.env.HLC_ESPEAK_VOICE || "hy";
const speechSpeed = process.env.HLC_ESPEAK_SPEED || "122";
const speechPitch = process.env.HLC_ESPEAK_PITCH || "48";

if (!speechBinary) {
  console.error("Could not find espeak-ng or espeak. Add human audio through the admin page or install eSpeak NG.");
  process.exit(1);
}

const files = pack.files || {};
const wordsPath = join(target, files.words || "dictionary/words.jsonl");
const lettersPath = join(target, files.letters || "dictionary/letters.jsonl");
const sentencesPath = join(target, files.sentences || "dictionary/sentences.jsonl");
const words = parseJsonl(readFileSync(wordsPath, "utf8"));
const letters = parseJsonl(existsSync(lettersPath) ? readFileSync(lettersPath, "utf8") : "");
const sentences = parseJsonl(existsSync(sentencesPath) ? readFileSync(sentencesPath, "utf8") : "");

for (const item of words) {
  item.ipa = item.ipa || ipa(item.target);
  item.complexity = item.complexity ?? item.difficulty ?? 1;
  replaceGeneratedAudio(item, item.id, item.target);
}
for (const grammar of sentences) {
  grammar.complexity = grammar.complexity ?? grammar.difficulty ?? 1;
  replaceGeneratedAudio(grammar, grammar.id, grammar.target_sentence);
}
for (const letter of letters) replaceGeneratedAudio(letter, letter.id, letter.character);

writeFileSync(wordsPath, writeJsonl(words));
if (existsSync(lettersPath)) writeFileSync(lettersPath, writeJsonl(letters));
if (existsSync(sentencesPath)) writeFileSync(sentencesPath, writeJsonl(sentences));
console.log(`Generated automated preview audio for ${pack.pack_id} using ${speechBinary} voice ${speechVoice}.`);

function findSpeechBinary() {
  for (const name of ["espeak-ng", "espeak"]) {
    const result = spawnSync(name, ["--version"], { encoding: "utf8" });
    if (result.status === 0) return name;
  }
  return null;
}

function normalizeTextForSpeech(text) {
  return String(text).replace(/[։:;]+/g, ".").replace(/\s+/g, " ").trim();
}

function synthesize(id, text) {
  const fileName = `${id}.wav`;
  const sourcePath = join(sourceDir, fileName);
  const publicPath = join(publicDir, fileName);
  if (!existsSync(sourcePath)) {
    const result = spawnSync(speechBinary, ["-v", speechVoice, "-s", speechSpeed, "-p", speechPitch, "-g", "8", "-w", sourcePath, normalizeTextForSpeech(text)], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr || `${speechBinary} failed for ${id}`);
  }
  copyFileSync(sourcePath, publicPath);
  return `/content-packs/${packSlug}/audio/auto/${fileName}`;
}

function ipa(text) {
  const result = spawnSync(speechBinary, ["-v", speechVoice, "-q", "--ipa", normalizeTextForSpeech(text)], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim().replace(/\s+/g, " ") : undefined;
}

function automatedRef(id, text) {
  return { id: `${id}_espeak_auto`, url: synthesize(id, text), speaker_label: `${speechBinary} Armenian automated preview`, source_type: "automated", engine: speechBinary, voice: speechVoice, text, mime_type: "audio/wav", license: "generated-preview-review-before-use", review_status: "draft" };
}

function browserTtsRef(id, text) {
  return { id: `${id}_browser_tts`, url: "browser-tts:hy-AM", speaker_label: "Browser TTS fallback", source_type: "browser_tts", text, license: "synthetic-browser-preview", review_status: "draft" };
}

function replaceGeneratedAudio(entry, id, text) {
  const humanAudio = (entry.audio || []).filter((audio) => audio.source_type === "human");
  entry.audio = [browserTtsRef(id, text), automatedRef(id, text), ...humanAudio];
}
