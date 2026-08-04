#!/usr/bin/env node
import { resolve } from "node:path";
import { loadModularPack } from "./pack-utils.mjs";

const packDir = resolve(process.argv[2] ?? "content-packs/da-foundations");
const pack = loadModularPack(packDir);
const errors = [];
const warnings = [];

const stageOf = (tags = []) => {
  const tag = tags.find((entry) => entry.startsWith("stage:"));
  const stage = tag ? Number(tag.slice("stage:".length)) : Number.NaN;
  return Number.isFinite(stage) ? stage : undefined;
};

const lettersByCharacter = new Map();
const lettersById = new Map();
for (const letter of pack.letters ?? []) {
  const character = letter.lowercase ?? letter.character;
  if (lettersByCharacter.has(character)) errors.push(`Duplicate grapheme: ${character}`);
  lettersByCharacter.set(character, letter);
  lettersById.set(letter.id, letter);
  if (stageOf(letter.tags) === undefined) errors.push(`${letter.id}: missing controlled stage tag.`);
  if (!(letter.example_item_ids?.length || letter.example_word)) errors.push(`${letter.id}: needs an example word for sound-led instruction.`);
  if ((letter.sound_audio ?? []).some((entry) => entry.source_type === "browser_tts")) {
    errors.push(`${letter.id}: isolated phonemes must not use browser speech synthesis.`);
  }
}
if (lettersByCharacter.size < 17) errors.push("Phase B must contain at least 17 introduced graphemes.");

const itemsById = new Map((pack.items ?? []).map((item) => [item.id, item]));
if ((pack.items ?? []).length < 30) errors.push("Phase B must contain at least 30 reading words.");
for (const item of pack.items ?? []) {
  const itemStage = stageOf(item.tags);
  if (itemStage === undefined) errors.push(`${item.id}: missing controlled stage tag.`);
  const graphemes = item.graphemes ?? [...item.target];
  if (graphemes.join("") !== item.target) errors.push(`${item.id}: graphemes do not reconstruct '${item.target}'.`);
  for (const grapheme of graphemes) {
    const letter = lettersByCharacter.get(grapheme);
    if (!letter) {
      errors.push(`${item.id}: grapheme '${grapheme}' has not been introduced.`);
      continue;
    }
    const letterStage = stageOf(letter.tags);
    if (itemStage !== undefined && letterStage !== undefined && letterStage > itemStage) {
      errors.push(`${item.id}: grapheme '${grapheme}' is introduced at stage ${letterStage}, after the word at stage ${itemStage}.`);
    }
  }
  if (!item.emoji && !item.image) warnings.push(`${item.id}: early picture-word tasks should have an emoji or image.`);
}

for (const letter of pack.letters ?? []) {
  for (const itemId of letter.example_item_ids ?? []) {
    const item = itemsById.get(itemId);
    if (!item) {
      errors.push(`${letter.id}: example item '${itemId}' does not exist.`);
      continue;
    }
    const character = letter.lowercase ?? letter.character;
    if (item.graphemes?.[0] !== character) errors.push(`${letter.id}: example '${item.target}' does not begin with '${character}'.`);
  }
}

const ids = new Set();
const domains = new Set();
for (const problem of pack.math_problems ?? []) {
  if (ids.has(problem.id)) errors.push(`Duplicate math problem: ${problem.id}`);
  ids.add(problem.id);
  domains.add(problem.domain);
  if (stageOf(problem.tags) === undefined) errors.push(`${problem.id}: missing controlled stage tag.`);
  const minimum = problem.number_range?.min ?? 0;
  const maximum = problem.number_range?.max ?? 10;
  const operands = problem.operands ?? [];
  if (problem.domain !== "comparison" && (problem.result < minimum || problem.result > maximum)) {
    errors.push(`${problem.id}: result is outside its number range.`);
  }
  if (operands.some((operand) => operand < minimum || operand > maximum)) errors.push(`${problem.id}: operand is outside its number range.`);
  if (problem.domain === "addition") {
    const [left, right] = operands;
    if (!Number.isFinite(left) || !Number.isFinite(right) || left + right !== problem.result) errors.push(`${problem.id}: incorrect addition definition.`);
  }
  if (problem.domain === "subtraction") {
    const [left, right] = operands;
    if (!Number.isFinite(left) || !Number.isFinite(right) || left - right !== problem.result || problem.result < 0) errors.push(`${problem.id}: incorrect subtraction definition.`);
  }
  if (problem.domain === "number_order") {
    const [before, after] = operands;
    if (before + 1 !== problem.result || problem.result + 1 !== after) errors.push(`${problem.id}: number-order operands must surround the result.`);
  }
  if (problem.domain === "comparison") {
    const [left, right] = operands;
    const expected = left > right ? 1 : left < right ? -1 : 0;
    if (!Number.isFinite(left) || !Number.isFinite(right) || problem.result !== expected) errors.push(`${problem.id}: comparison result must be 1, -1, or 0 according to the two quantities.`);
  }
}

for (const required of ["counting", "number_match", "number_order", "comparison", "addition", "subtraction"]) {
  if (!domains.has(required)) errors.push(`Phase B is missing math domain: ${required}.`);
}

const levels = pack.levels ?? [];
for (const expected of [0, 1, 2, 3, 4]) {
  const level = levels.find((entry) => entry.number === expected);
  if (!level) {
    errors.push(`Phase B is missing level ${expected}.`);
    continue;
  }
  if (!level.chapter_id) errors.push(`Level ${expected}: missing chapter_id.`);
  if ((level.unlock_requires?.completed_training_sessions ?? 0) < 6) warnings.push(`Level ${expected}: workload may be too short for several child-sized sessions.`);
}

for (const level of levels.filter((entry) => entry.number <= 4)) {
  const chapter = pack.story?.chapters?.find((entry) => entry.id === level.chapter_id || entry.minimum_level === level.number);
  if (!chapter?.lesson || !chapter.fiction || !chapter.mission) errors.push(`Level ${level.number}: needs fiction, a structured lesson, and a mission.`);
  if ((chapter?.lesson?.objectives?.length ?? 0) < 2) warnings.push(`Level ${level.number}: consider at least two explicit lesson objectives.`);
}

if ((pack.labyrinths?.[0]?.questions.minimum ?? 0) < 12) warnings.push("The Phase B labyrinth may be too short to exercise the expanded domains.");

if (errors.length) {
  console.error("Danish foundations curriculum validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
for (const warning of warnings) console.warn(`Warning: ${warning}`);
console.log(`Danish foundations Phase B curriculum passed: ${lettersByCharacter.size} graphemes, ${pack.items.length} words, ${pack.math_problems?.length ?? 0} math problems, ${levels.filter((level) => level.number <= 4).length} levels.`);
