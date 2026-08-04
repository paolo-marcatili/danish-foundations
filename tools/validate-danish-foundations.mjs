#!/usr/bin/env node
import { resolve } from "node:path";
import { loadModularPack } from "./pack-utils.mjs";

const packDir = resolve(process.argv[2] ?? "content-packs/da-foundations");
const pack = loadModularPack(packDir);
const errors = [];
const warnings = [];

const letters = new Map((pack.letters ?? []).map((letter) => [letter.lowercase ?? letter.character, letter]));
if (letters.size < 5) errors.push("Phase A must contain at least five graphemes.");

for (const item of pack.items ?? []) {
  const graphemes = item.graphemes ?? [...item.target];
  if (graphemes.join("") !== item.target) errors.push(`${item.id}: graphemes do not reconstruct '${item.target}'.`);
  for (const grapheme of graphemes) if (!letters.has(grapheme)) errors.push(`${item.id}: grapheme '${grapheme}' has not been introduced.`);
  if (!item.emoji && !item.image) warnings.push(`${item.id}: early picture-word tasks should have an emoji or image.`);
}

const ids = new Set();
const domains = new Set();
for (const problem of pack.math_problems ?? []) {
  if (ids.has(problem.id)) errors.push(`Duplicate math problem: ${problem.id}`);
  ids.add(problem.id);
  domains.add(problem.domain);
  const minimum = problem.number_range?.min ?? 0;
  const maximum = problem.number_range?.max ?? 5;
  if (problem.result < minimum || problem.result > maximum) errors.push(`${problem.id}: result is outside its number range.`);
  if (problem.domain === "addition") {
    const [left, right] = problem.operands ?? [];
    if (!Number.isFinite(left) || !Number.isFinite(right) || left + right !== problem.result) errors.push(`${problem.id}: incorrect addition definition.`);
  }
  if (problem.domain === "subtraction") {
    const [left, right] = problem.operands ?? [];
    if (!Number.isFinite(left) || !Number.isFinite(right) || left - right !== problem.result || problem.result < 0) errors.push(`${problem.id}: incorrect subtraction definition.`);
  }
  if (problem.domain === "number_order") {
    const [before, after] = problem.operands ?? [];
    if (before + 1 !== problem.result || problem.result + 1 !== after) errors.push(`${problem.id}: number-order operands must surround the result.`);
  }
}

for (const required of ["counting", "number_match", "number_order", "addition", "subtraction"]) {
  if (!domains.has(required)) errors.push(`Phase A is missing math domain: ${required}.`);
}

const chapter = pack.story?.chapters?.find((entry) => entry.minimum_level === 0);
if (!chapter?.lesson || !chapter.fiction || !chapter.mission) errors.push("Level 0 needs fiction, a structured lesson, and a mission.");
if ((pack.labyrinths?.[0]?.questions.minimum ?? 0) < 8) warnings.push("The prototype labyrinth may be too short to exercise every domain.");

if (errors.length) {
  console.error("Danish foundations curriculum validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
for (const warning of warnings) console.warn(`Warning: ${warning}`);
console.log(`Danish foundations curriculum passed: ${letters.size} graphemes, ${pack.items.length} words, ${pack.math_problems?.length ?? 0} math problems.`);
