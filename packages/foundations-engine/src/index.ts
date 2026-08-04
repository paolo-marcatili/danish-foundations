import type {
  ActivityType,
  AudioReference,
  FoundationsMathProblem,
  GrammarItem,
  LanguagePack,
  LearningItem,
  LetterItem
} from "@hero-lang/content-schema";
import { getLocalizedText } from "@hero-lang/content-schema";
import type {
  AnswerOption,
  HeroStatKey,
  LearnerState,
  QuestionSelectionOptions,
  QuestionVariant,
  TrainingFocus,
  TrainingQuestion
} from "@hero-lang/learning-engine";

export {
  answerQuestion,
  buyShopItem,
  consumeLabyrinthDoorStones,
  createInitialLearnerState,
  ensureLabyrinthDoorRequirement,
  getAverageMastery,
  getLabyrinthDoorRequirement,
  getLevelConfig,
  getLevelStatCap,
  getMaxComplexityForLevel,
  getMaxEnergy,
  getMissingLabyrinthStones,
  getStatValue,
  markEnemyDefeated,
  markLabyrinthCompleted,
  markTrainingSessionCompleted,
  normalizeLearnerState,
  TRAINING_STONE_CAP
} from "@hero-lang/learning-engine";

export type {
  AnswerExplanation,
  AnswerGloss,
  AnswerOption,
  AnswerResult,
  CombatBreakdown,
  HeroStatKey,
  HeroStats,
  LabyrinthDoorRequirement,
  LearnerState,
  PracticeMemory,
  QuestionSelectionOptions,
  ShopItem,
  TrainingFocus,
  TrainingQuestion,
  TrainingStoneInventory
} from "@hero-lang/learning-engine";

const FOCUS_STAT: Record<TrainingFocus, HeroStatKey> = {
  vocabulary: "strength",
  comprehension: "defense",
  grammar: "precision",
  pronunciation: "stamina"
};

export function hasEligibleQuestion(
  pack: LanguagePack,
  focus: TrainingFocus,
  selection: QuestionSelectionOptions = {}
): boolean {
  if (focus === "vocabulary") return filterLetters(pack.letters ?? [], selection).length >= 2;
  if (focus === "comprehension") return filterItems(pack.items, selection).length >= 1;
  const domains = focus === "grammar"
    ? new Set(["counting", "number_match", "number_order"])
    : new Set(["addition", "subtraction"]);
  return filterMathProblems(pack.math_problems ?? [], selection).some((problem) => domains.has(problem.domain));
}

export function getNextQuestion(
  pack: LanguagePack,
  state: LearnerState,
  baseLanguage = "da",
  focus: TrainingFocus = "vocabulary",
  selection: QuestionSelectionOptions = {}
): TrainingQuestion {
  if (focus === "vocabulary") return getLetterQuestion(pack, state, baseLanguage, selection);
  if (focus === "comprehension") return getReadingQuestion(pack, state, baseLanguage, selection);
  if (focus === "grammar") return getNumberQuestion(pack, state, baseLanguage, selection);
  return getOperationQuestion(pack, state, baseLanguage, selection);
}

function getLetterQuestion(
  pack: LanguagePack,
  state: LearnerState,
  language: string,
  selection: QuestionSelectionOptions
): TrainingQuestion {
  const letters = filterLetters(pack.letters ?? [], selection);
  if (letters.length === 0) throw new Error("No Danish graphemes are available.");
  const letter = chooseByMastery(letters, (entry) => state.mastery_by_letter[entry.id]?.mastery ?? 0);
  const useAudio = Math.random() < 0.55;

  if (useAudio) {
    const options = makeLetterOptions(letter, letters, (entry) => entry.lowercase ?? entry.character);
    return {
      id: `foundations:letter-sound:${letter.id}:${Date.now()}`,
      kind: "letter",
      activity_type: "listen_and_choose",
      skill: "vocabulary",
      stat: FOCUS_STAT.vocabulary,
      variant: "letter_sound",
      letter,
      prompt: "🔊",
      prompt_hint: "Lyt til bogstavlyden. Hvilket bogstav passer?",
      options,
      correct_option_id: optionId(letter.id),
      correct_answer_label: letter.lowercase ?? letter.character,
      answer_explanation: {
        target: `${letter.uppercase ?? letter.character} ${letter.lowercase ?? letter.character}`,
        translation: `Bogstavet hedder ${getLocalizedText(letter.names, language, letter.spoken_name ?? letter.sound)}.`
      },
      target_audio_text: letter.sound,
      target_audio_lang: "da-DK",
      audio: letter.sound_audio?.length ? letter.sound_audio : browserSpeech(letter.sound, `sound-${letter.id}`),
      secondary_audio: letter.audio,
      secondary_audio_text: letter.spoken_name ?? getLocalizedText(letter.names, language, letter.character)
    };
  }

  const options = makeLetterOptions(letter, letters, (entry) => entry.lowercase ?? entry.character);
  return {
    id: `foundations:letter-case:${letter.id}:${Date.now()}`,
    kind: "letter",
    activity_type: "letter_recognition",
    skill: "vocabulary",
    stat: FOCUS_STAT.vocabulary,
    variant: "target_to_base",
    letter,
    prompt: letter.uppercase ?? letter.character.toUpperCase(),
    prompt_hint: "Find det lille bogstav, der passer til det store.",
    options,
    correct_option_id: optionId(letter.id),
    correct_answer_label: letter.lowercase ?? letter.character,
    answer_explanation: {
      target: `${letter.uppercase ?? letter.character} ${letter.lowercase ?? letter.character}`,
      translation: `Stort og lille ${getLocalizedText(letter.names, language, letter.character)}.`
    },
    target_audio_text: letter.spoken_name ?? letter.character,
    target_audio_lang: "da-DK",
    audio: letter.audio?.length ? letter.audio : browserSpeech(letter.spoken_name ?? letter.character, `name-${letter.id}`),
    secondary_audio: letter.sound_audio,
    secondary_audio_text: letter.sound
  };
}

function getReadingQuestion(
  pack: LanguagePack,
  state: LearnerState,
  language: string,
  selection: QuestionSelectionOptions
): TrainingQuestion {
  const items = filterItems(pack.items, selection);
  if (items.length === 0) throw new Error("No Danish reading words are available.");
  const item = chooseByMastery(items, (entry) => state.mastery_by_item[entry.id]?.mastery ?? 0);
  const buildWord = Math.random() < 0.5 && (item.graphemes?.length ?? 0) >= 2;

  if (buildWord) {
    const correctLetters = item.graphemes ?? [...item.target];
    const knownLetters = (pack.letters ?? []).map((letter) => letter.lowercase ?? letter.character);
    const decoy = shuffle(knownLetters.filter((letter) => !correctLetters.includes(letter))).slice(0, 1);
    const chips = shuffle([...correctLetters.map((label, index) => ({ id: `${item.id}-${index}`, label })), ...decoy.map((label, index) => ({ id: `${item.id}-decoy-${index}`, label, is_hard_distractor: true }))]);
    return {
      id: `foundations:build-word:${item.id}:${Date.now()}`,
      kind: "item",
      activity_type: "syllable_order",
      skill: "comprehension",
      stat: FOCUS_STAT.comprehension,
      variant: "sentence_tap_order",
      item,
      prompt: item.emoji ?? item.image ?? "🧩",
      prompt_hint: `Byg ordet “${item.target}” med bogstaverne.`,
      options: chips,
      correct_option_id: correctLetters.join(" "),
      correct_answer_label: item.target,
      expected_answer_length: correctLetters.length,
      answer_explanation: {
        target: item.target,
        translation: item.translation
      },
      target_audio_text: item.target,
      target_audio_lang: "da-DK",
      audio: item.audio?.length ? item.audio : browserSpeech(item.target, `word-${item.id}`)
    };
  }

  const distractors = shuffle(items.filter((candidate) => candidate.id !== item.id)).slice(0, 3);
  const generated = [item, ...distractors];
  while (generated.length < 4) {
    const fake = makePseudoWord(item, generated.length);
    generated.push(fake);
  }
  const options = shuffle(generated).map((candidate) => ({ id: optionId(candidate.id), label: candidate.target }));
  return {
    id: `foundations:picture-word:${item.id}:${Date.now()}`,
    kind: "item",
    activity_type: "image_match",
    skill: "comprehension",
    stat: FOCUS_STAT.comprehension,
    variant: "visual_to_target",
    item,
    prompt: item.emoji ?? item.image ?? "🖼️",
    prompt_hint: "Hvilket ord passer til billedet?",
    options,
    correct_option_id: optionId(item.id),
    correct_answer_label: item.target,
    answer_explanation: {
      target: item.target,
      translation: item.translation
    },
    target_audio_text: item.target,
    target_audio_lang: "da-DK",
    audio: item.audio?.length ? item.audio : browserSpeech(item.target, `word-${item.id}`)
  };
}

function getNumberQuestion(
  pack: LanguagePack,
  state: LearnerState,
  language: string,
  selection: QuestionSelectionOptions
): TrainingQuestion {
  const candidates = filterMathProblems(pack.math_problems ?? [], selection)
    .filter((problem) => problem.domain === "counting" || problem.domain === "number_match" || problem.domain === "number_order");
  if (candidates.length === 0) throw new Error("No counting problems are available.");
  const problem = chooseByMastery(candidates, (entry) => state.mastery_by_grammar[entry.id]?.mastery ?? 0);
  return mathQuestion(problem, "grammar", language);
}

function getOperationQuestion(
  pack: LanguagePack,
  state: LearnerState,
  language: string,
  selection: QuestionSelectionOptions
): TrainingQuestion {
  const candidates = filterMathProblems(pack.math_problems ?? [], selection)
    .filter((problem) => problem.domain === "addition" || problem.domain === "subtraction");
  if (candidates.length === 0) throw new Error("No arithmetic problems are available.");
  const problem = chooseByMastery(candidates, (entry) => state.mastery_by_grammar[entry.id]?.mastery ?? 0);
  return mathQuestion(problem, "pronunciation", language);
}

function mathQuestion(problem: FoundationsMathProblem, focus: TrainingFocus, language: string): TrainingQuestion {
  const grammar = mathProblemToGrammar(problem, language);
  const result = problem.result;
  const object = problem.object ?? "●";
  const rangeMin = problem.number_range?.min ?? 0;
  const rangeMax = problem.number_range?.max ?? 5;
  const numberOptions = numericOptions(result, rangeMin, rangeMax);
  let prompt = getLocalizedText(problem.prompt, language, "Hvor mange?");
  let promptHint = "Vælg det rigtige tal.";
  let options: AnswerOption[] = numberOptions.map((value) => ({ id: optionId(String(value)), label: String(value) }));
  let activity: ActivityType = "visual_match";
  let variant: QuestionVariant = "target_to_base";

  if (problem.domain === "counting") {
    prompt = makeObjects(object, result);
    promptHint = "Tæl tingene. Hvor mange er der?";
  } else if (problem.domain === "number_match") {
    prompt = String(result);
    promptHint = "Hvilken gruppe har så mange?";
    options = shuffle(numberOptions).map((value) => ({ id: optionId(String(value)), label: makeObjects(object, value) || "0" }));
  } else if (problem.domain === "number_order") {
    const operands = problem.operands ?? [Math.max(0, result - 1), result + 1];
    prompt = `${operands[0]}  •  ?  •  ${operands[1]}`;
    promptHint = "Hvilket tal mangler i rækken?";
  } else {
    const [left = 0, right = 0] = problem.operands ?? [];
    const sign = problem.domain === "addition" ? "+" : "−";
    prompt = `${makeObjects(object, left)}  ${sign}  ${makeObjects(object, right)}`;
    promptHint = problem.domain === "addition"
      ? "Læg grupperne sammen. Hvor mange er der i alt?"
      : "Tag den anden gruppe væk. Hvor mange er der tilbage?";
    activity = "visual_match";
    variant = "target_to_visual";
  }

  return {
    id: `foundations:math:${problem.id}:${Date.now()}`,
    kind: "grammar",
    activity_type: activity,
    skill: focus,
    stat: FOCUS_STAT[focus],
    variant,
    grammar,
    prompt,
    prompt_hint: promptHint,
    options,
    correct_option_id: optionId(String(result)),
    correct_answer_label: String(result),
    answer_explanation: {
      target: grammar.target_sentence,
      translation: getLocalizedText(problem.prompt, language, grammar.translation)
    },
    target_audio_text: getLocalizedText(problem.prompt, language, grammar.translation),
    target_audio_lang: "da-DK",
    audio: browserSpeech(getLocalizedText(problem.prompt, language, grammar.translation), `math-${problem.id}`)
  };
}

function mathProblemToGrammar(problem: FoundationsMathProblem, language: string): GrammarItem {
  const [left, right] = problem.operands ?? [];
  const equation = problem.domain === "addition"
    ? `${left} + ${right} = ${problem.result}`
    : problem.domain === "subtraction"
      ? `${left} − ${right} = ${problem.result}`
      : String(problem.result);
  return {
    id: problem.id,
    prompt: problem.prompt,
    target_sentence: equation,
    translation: getLocalizedText(problem.prompt, language, equation),
    translations: problem.prompt,
    distractors: numericOptions(problem.result, problem.number_range?.min ?? 0, problem.number_range?.max ?? 5)
      .filter((value) => value !== problem.result)
      .map(String),
    tags: problem.tags,
    audio: [],
    review_status: problem.review_status
  };
}

function filterLetters(letters: LetterItem[], selection: QuestionSelectionOptions): LetterItem[] {
  return letters.filter((letter) => matchesStage(letter.tags ?? [], selection.stage));
}

function filterItems(items: LearningItem[], selection: QuestionSelectionOptions): LearningItem[] {
  return items.filter((item) => matchesStage(item.tags, selection.stage) && !item.tags.includes("tier:extension"));
}

function filterMathProblems(problems: FoundationsMathProblem[], selection: QuestionSelectionOptions): FoundationsMathProblem[] {
  return problems.filter((problem) => matchesStage(problem.tags, selection.stage));
}

function matchesStage(tags: string[], stage: number | undefined): boolean {
  if (stage === undefined) return true;
  const itemStage = tags.find((tag) => tag.startsWith("stage:"));
  if (!itemStage) return stage === 0;
  const value = Number(itemStage.slice("stage:".length));
  return Number.isFinite(value) && value <= stage;
}

function makeLetterOptions(letter: LetterItem, letters: LetterItem[], label: (entry: LetterItem) => string): AnswerOption[] {
  const choices = [letter, ...shuffle(letters.filter((candidate) => candidate.id !== letter.id)).slice(0, 3)];
  return shuffle(choices).map((entry) => ({ id: optionId(entry.id), label: label(entry) }));
}

function numericOptions(correct: number, min: number, max: number): number[] {
  const values = new Set<number>([correct]);
  const candidates = shuffle(Array.from({ length: Math.max(1, max - min + 1) }, (_, index) => min + index).filter((value) => value !== correct));
  for (const value of candidates) {
    values.add(value);
    if (values.size >= 4) break;
  }
  let extra = max + 1;
  while (values.size < 4) values.add(extra++);
  return shuffle([...values]);
}

function makeObjects(object: string, count: number): string {
  if (count <= 0) return "∅";
  return Array.from({ length: count }, () => object).join(" ");
}

function browserSpeech(text: string, id: string): AudioReference[] {
  return [{
    id: `browser-${id}`,
    url: "browser-tts:da-DK",
    text,
    source_type: "browser_tts",
    provider: "system",
    license: "device voice",
    review_status: "draft"
  }];
}

function makePseudoWord(item: LearningItem, index: number): LearningItem {
  const letters = [...item.target];
  const rotated = letters.length > 1 ? [...letters.slice(index % letters.length), ...letters.slice(0, index % letters.length)].join("") : `${item.target}${index}`;
  return { ...item, id: `${item.id}-pseudo-${index}`, target: rotated === item.target ? [...letters].reverse().join("") : rotated };
}

function chooseByMastery<T>(values: T[], mastery: (value: T) => number): T {
  const ranked = [...values].sort((left, right) => mastery(left) - mastery(right));
  const pool = ranked.slice(0, Math.max(1, Math.ceil(ranked.length / 2)));
  return pool[Math.floor(Math.random() * pool.length)] ?? ranked[0];
}

function optionId(value: string): string {
  return `answer:${value}`;
}

function shuffle<T>(values: T[]): T[] {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}
