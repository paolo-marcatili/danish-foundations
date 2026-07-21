import type { GrammarItem, LanguagePack, LearningItem, AudioReference, LocalizedText } from "@hero-lang/content-schema";

export interface ContributionAudio {
  text?: string;
  data_url?: string;
  dataUrl?: string;
  url?: string;
  mime_type?: string;
  mimeType?: string;
  duration_ms?: number;
  speaker_label?: string;
  source_type?: "human" | "automated" | "browser_tts";
  license?: string;
  review_status?: "draft" | "needs_native_speaker_review" | "approved";
}

type ItemContribution = Omit<Partial<LearningItem>, "audio"> & { translations?: LocalizedText; audio?: ContributionAudio[] };
type GrammarContribution = Omit<Partial<GrammarItem>, "audio"> & { translations?: LocalizedText; audio?: ContributionAudio[] };

export interface ContentContribution {
  schema_version?: number;
  pack_id?: string;
  created_at?: string;
  contributor_note?: string;
  items?: ItemContribution[];
  grammar_items?: GrammarContribution[];
}

export interface MergeSummary {
  addedItems: number;
  updatedItems: number;
  addedGrammar: number;
  updatedGrammar: number;
  addedAudio: number;
  addedBrowserTts: number;
}

const LOCAL_PACK_KEY_PREFIX = "hero-language-camp:v0.9:local-pack";
const LEGACY_LOCAL_PACK_KEY_PREFIXES = ["hero-language-camp:v0.8:local-pack", "hero-language-camp:v0.7:local-pack", "hero-language-camp:v0.6:local-pack", "hero-language-camp:v0.5:local-pack", "hero-language-camp:v0.4:local-pack"];

export function loadLocalPack(basePack: LanguagePack): LanguagePack {
  if (typeof window === "undefined") return basePack;
  const raw = window.localStorage.getItem(`${LOCAL_PACK_KEY_PREFIX}:${basePack.pack_id}`)
    ?? LEGACY_LOCAL_PACK_KEY_PREFIXES.map((prefix) => window.localStorage.getItem(`${prefix}:${basePack.pack_id}`)).find(Boolean)
    ?? null;
  if (!raw) return basePack;
  try {
    const parsed = JSON.parse(raw) as LanguagePack;
    if (parsed.pack_id !== basePack.pack_id) return basePack;

    // Keep locally edited dictionary/audio content, while inheriting new
    // versioned pack configuration (levels, UI text, labyrinths, etc.) that
    // older browser snapshots may not contain.
    return {
      ...basePack,
      ...parsed,
      // Runtime configuration and schema version come from the bundled pack.
      // Local snapshots are intended to preserve contributed dictionary/audio
      // content, not pin the app to an older pack version.
      version: basePack.version,
      ui_text: { ...(basePack.ui_text ?? {}), ...(parsed.ui_text ?? {}) },
      controlled_tags: parsed.controlled_tags ?? basePack.controlled_tags,
      task_config: basePack.task_config ?? parsed.task_config,
      training_options: basePack.training_options ?? parsed.training_options,
      levels: basePack.levels ?? parsed.levels,
      enemies: basePack.enemies ?? parsed.enemies,
      labyrinths: basePack.labyrinths ?? parsed.labyrinths,
      story: basePack.story ?? parsed.story,
      files: basePack.files ?? parsed.files,
      items: parsed.items ?? basePack.items,
      letters: parsed.letters ?? basePack.letters,
      grammar_items: mergeLocalGrammarItems(basePack.grammar_items ?? [], parsed.grammar_items ?? [])
    };
  } catch {
    return basePack;
  }
}

export function saveLocalPack(pack: LanguagePack): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${LOCAL_PACK_KEY_PREFIX}:${pack.pack_id}`, JSON.stringify(pack));
  } catch {
    // Audio data URLs can eventually become too large for localStorage.
    // The export button still lets the contributor save a portable JSON file.
  }
}

export function resetLocalPack(pack: LanguagePack): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${LOCAL_PACK_KEY_PREFIX}:${pack.pack_id}`);
  for (const prefix of LEGACY_LOCAL_PACK_KEY_PREFIXES) {
    window.localStorage.removeItem(`${prefix}:${pack.pack_id}`);
  }
}

export function mergeContributionIntoPack(pack: LanguagePack, contribution: ContentContribution): { pack: LanguagePack; summary: MergeSummary } {
  const nextPack = clonePack(pack);
  const summary: MergeSummary = { addedItems: 0, updatedItems: 0, addedGrammar: 0, updatedGrammar: 0, addedAudio: 0, addedBrowserTts: 0 };

  if (!Array.isArray(nextPack.items)) nextPack.items = [];
  if (!Array.isArray(nextPack.grammar_items)) nextPack.grammar_items = [];

  for (const contributionItem of contribution.items ?? []) {
    const target = String(contributionItem.target ?? "").trim();
    if (!target) continue;

    let item = nextPack.items.find((candidate) => candidate.id === contributionItem.id || candidate.target.trim() === target);
    if (!item) {
      item = {
        id: uniqueId(nextPack.items, contributionItem.id || `hy_${slugify(contributionItem.transliteration || target)}`),
        concept: String(contributionItem.concept || slugify(contributionItem.transliteration || target)),
        target,
        translation: contributionItem.translations?.[nextPack.source_language] || contributionItem.translation || contributionItem.translations?.it || contributionItem.translations?.en || target,
        translations: cleanTranslations(contributionItem.translations),
        emoji: contributionItem.emoji,
        transliteration: contributionItem.transliteration,
        ipa: contributionItem.ipa,
        part_of_speech: contributionItem.part_of_speech,
        difficulty: Number(contributionItem.difficulty || 1),
        complexity: Number(contributionItem.complexity || contributionItem.difficulty || 1),
        tags: Array.isArray(contributionItem.tags) && contributionItem.tags.length > 0 ? contributionItem.tags : ["community"],
        audio: [],
        hard_distractor_ids: Array.isArray(contributionItem.hard_distractor_ids) ? contributionItem.hard_distractor_ids : [],
        review_status: contributionItem.review_status || "needs_native_speaker_review"
      };
      nextPack.items.push(item);
      summary.addedItems += 1;
    } else {
      item.translations = { ...(item.translations ?? {}), ...cleanTranslations(contributionItem.translations) };
      if (contributionItem.translation) item.translation = contributionItem.translation;
      if (contributionItem.emoji) item.emoji = contributionItem.emoji;
      if (!item.transliteration && contributionItem.transliteration) item.transliteration = contributionItem.transliteration;
      if (!item.ipa && contributionItem.ipa) item.ipa = contributionItem.ipa;
      if (contributionItem.difficulty) item.difficulty = Number(contributionItem.difficulty);
      if (contributionItem.complexity || contributionItem.difficulty) item.complexity = Number(contributionItem.complexity || contributionItem.difficulty);
      item.tags = uniqueStrings([...(item.tags ?? []), ...(contributionItem.tags ?? [])]);
      summary.updatedItems += 1;
    }

    const audioAdded = appendAudioReferences(item, contributionItem.audio ?? [], item.id, target, nextPack.language.bcp47);
    summary.addedAudio += audioAdded.addedAudio;
    summary.addedBrowserTts += audioAdded.addedBrowserTts;
  }

  for (const contributionGrammar of contribution.grammar_items ?? []) {
    const targetSentence = String(contributionGrammar.target_sentence ?? "").trim();
    if (!targetSentence) continue;

    let grammar = nextPack.grammar_items.find((candidate) => candidate.id === contributionGrammar.id || candidate.target_sentence.trim() === targetSentence);
    if (!grammar) {
      grammar = {
        id: uniqueId(nextPack.grammar_items, contributionGrammar.id || `hy_sentence_${slugify(targetSentence)}`),
        prompt: contributionGrammar.prompt || contributionGrammar.translations || { [nextPack.source_language]: targetSentence },
        target_sentence: targetSentence,
        translation: contributionGrammar.translation || contributionGrammar.translations?.[nextPack.source_language] || contributionGrammar.translations?.it || contributionGrammar.translations?.en || targetSentence,
        translations: cleanTranslations(contributionGrammar.translations),
        translation_distractors: cleanLocalizedStringLists(contributionGrammar.translation_distractors),
        distractors: Array.isArray(contributionGrammar.distractors) ? contributionGrammar.distractors : makeSentenceDistractors(targetSentence),
        difficulty: Number(contributionGrammar.difficulty || 1),
        complexity: Number(contributionGrammar.complexity || contributionGrammar.difficulty || 1),
        tags: Array.isArray(contributionGrammar.tags) && contributionGrammar.tags.length > 0 ? contributionGrammar.tags : ["community", "sentence_order"],
        audio: [],
        review_status: contributionGrammar.review_status || "needs_native_speaker_review"
      };
      nextPack.grammar_items.push(grammar);
      summary.addedGrammar += 1;
    } else {
      grammar.translations = { ...(grammar.translations ?? {}), ...cleanTranslations(contributionGrammar.translations) };
      if (contributionGrammar.translation) grammar.translation = contributionGrammar.translation;
      const translationDistractors = cleanLocalizedStringLists(contributionGrammar.translation_distractors);
      if (translationDistractors) grammar.translation_distractors = { ...(grammar.translation_distractors ?? {}), ...translationDistractors };
      if (contributionGrammar.difficulty) grammar.difficulty = Number(contributionGrammar.difficulty);
      if (contributionGrammar.complexity || contributionGrammar.difficulty) grammar.complexity = Number(contributionGrammar.complexity || contributionGrammar.difficulty);
      grammar.tags = uniqueStrings([...(grammar.tags ?? []), ...(contributionGrammar.tags ?? [])]);
      grammar.distractors = uniqueStrings([...(grammar.distractors ?? []), ...(contributionGrammar.distractors ?? [])]);
      if (grammar.distractors.length === 0) grammar.distractors = makeSentenceDistractors(grammar.target_sentence);
      summary.updatedGrammar += 1;
    }

    const audioAdded = appendAudioReferences(grammar, contributionGrammar.audio ?? [], grammar.id, targetSentence, nextPack.language.bcp47);
    summary.addedAudio += audioAdded.addedAudio;
    summary.addedBrowserTts += audioAdded.addedBrowserTts;
  }

  nextPack.version = bumpPatchVersion(nextPack.version);
  return { pack: nextPack, summary };
}

function mergeLocalGrammarItems(baseItems: GrammarItem[], localItems: GrammarItem[]): GrammarItem[] {
  const baseById = new Map(baseItems.map((item) => [item.id, item]));
  const merged = localItems.map((local) => {
    const base = baseById.get(local.id);
    if (!base) return local;
    return {
      ...base,
      ...local,
      translations: { ...(base.translations ?? {}), ...(local.translations ?? {}) },
      prompt: { ...(base.prompt ?? {}), ...(local.prompt ?? {}) },
      translation_distractors: { ...(base.translation_distractors ?? {}), ...(local.translation_distractors ?? {}) }
    };
  });
  const localIds = new Set(localItems.map((item) => item.id));
  return [...merged, ...baseItems.filter((item) => !localIds.has(item.id))];
}

function cleanLocalizedStringLists(value: GrammarItem["translation_distractors"] | undefined): GrammarItem["translation_distractors"] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const cleaned = Object.fromEntries(
    Object.entries(value)
      .map(([code, entries]) => [code, uniqueStrings(Array.isArray(entries) ? entries.map(String) : [])] as const)
      .filter(([, entries]) => entries.length > 0)
  );
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function appendAudioReferences(
  entry: { audio?: AudioReference[] },
  audioContributions: ContributionAudio[],
  entryId: string,
  text: string,
  languageTag: string
): { addedAudio: number; addedBrowserTts: number } {
  if (!Array.isArray(entry.audio)) entry.audio = [];
  let addedAudio = 0;
  let addedBrowserTts = 0;

  for (const audio of audioContributions) {
    const dataUrl = audio.data_url ?? audio.dataUrl;
    const url = dataUrl || audio.url;
    if (!url) continue;
    const sourceType = audio.source_type || "human";
    const id = uniqueAudioId(entry.audio, `${entryId}_${sourceType}_${Date.now()}_${addedAudio}`);
    entry.audio.push({
      id,
      url,
      speaker_label: audio.speaker_label || (sourceType === "human" ? "Community speaker" : "Automated preview"),
      source_type: sourceType,
      engine: sourceType === "browser_tts" ? "Browser SpeechSynthesis" : undefined,
      text: audio.text || text,
      mime_type: audio.mime_type ?? audio.mimeType,
      license: audio.license || (sourceType === "human" ? "CC-BY-4.0" : "synthetic-browser-preview"),
      review_status: audio.review_status || (sourceType === "human" ? "needs_native_speaker_review" : "draft")
    });
    addedAudio += 1;
  }

  const hasHuman = entry.audio.some((audio) => audio.source_type === "human");
  const hasAnyPlayable = entry.audio.some((audio) => Boolean(audio.url));
  const hasBrowserTts = entry.audio.some((audio) => audio.source_type === "browser_tts" || audio.url.startsWith("browser-tts:"));
  if (!hasHuman && (!hasAnyPlayable || !hasBrowserTts)) {
    entry.audio.push(browserTtsRef(entry.audio, entryId, text, languageTag));
    addedBrowserTts += 1;
  }

  return { addedAudio, addedBrowserTts };
}

function browserTtsRef(existingAudio: AudioReference[], entryId: string, text: string, languageTag: string): AudioReference {
  return {
    id: uniqueAudioId(existingAudio, `${entryId}_browser_tts`),
    url: `browser-tts:${languageTag}`,
    speaker_label: "Browser TTS fallback",
    source_type: "browser_tts",
    engine: "Browser SpeechSynthesis",
    text,
    license: "synthetic-browser-preview",
    review_status: "draft"
  };
}

function cleanTranslations(translations: LocalizedText | undefined): LocalizedText {
  if (!translations) return {};
  return Object.fromEntries(Object.entries(translations).filter(([, value]) => typeof value === "string" && value.trim()).map(([key, value]) => [key, value.trim()]));
}

function uniqueId(items: Array<{ id: string }>, preferred: string): string {
  const existing = new Set(items.map((item) => item.id));
  const root = String(preferred || "item").replace(/[^A-Za-z0-9_\-]/g, "_");
  let id = root;
  let suffix = 2;
  while (existing.has(id)) {
    id = `${root}_${suffix}`;
    suffix += 1;
  }
  return id;
}

function uniqueAudioId(audio: AudioReference[], preferred: string): string {
  const existing = new Set(audio.map((entry) => entry.id));
  const root = String(preferred).replace(/[^A-Za-z0-9_\-]/g, "_");
  let id = root;
  let suffix = 2;
  while (existing.has(id)) {
    id = `${root}_${suffix}`;
    suffix += 1;
  }
  return id;
}

function uniqueStrings(values: unknown[]): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim()))];
}

function makeSentenceDistractors(sentence: string): string[] {
  const words = sentence.split(/\s+/).filter(Boolean);
  if (words.length < 2) return [];
  return uniqueStrings([
    [...words].reverse().join(" "),
    [words[1], words[0], ...words.slice(2)].join(" "),
    [...words.slice(1), words[0]].join(" ")
  ]).filter((candidate) => candidate !== sentence).slice(0, 3);
}

function slugify(value: unknown): string {
  const slug = String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return slug || Math.random().toString(36).slice(2, 8);
}

function clonePack(pack: LanguagePack): LanguagePack {
  return JSON.parse(JSON.stringify(pack)) as LanguagePack;
}

function bumpPatchVersion(version: string): string {
  const match = /^(\d+)\.(\d+)\.(\d+)(.*)$/.exec(version);
  if (!match) return version;
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}${match[4] || ""}`;
}
