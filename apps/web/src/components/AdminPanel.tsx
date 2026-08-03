import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { GrammarItem, LanguagePack, LearningItem } from "@hero-lang/content-schema";
import { getGrammarTranslation, getItemTranslation } from "@hero-lang/content-schema";
import type { ContentContribution, MergeSummary } from "../contentMerge";
import { t } from "../i18n";

interface AdminPanelProps {
  pack: LanguagePack;
  language: string;
  onMergeContribution: (contribution: ContentContribution) => MergeSummary;
  onExportPack: () => void;
  onResetLocalPack: () => void;
  onClose: () => void;
}

type ContributionKind = "word" | "sentence";

interface RecordedAudio {
  dataUrl: string;
  mimeType: string;
  durationMs?: number;
}

export function AdminPanel({ pack, language, onMergeContribution, onExportPack, onResetLocalPack, onClose }: AdminPanelProps) {
  const [kind, setKind] = useState<ContributionKind>("word");
  const [target, setTarget] = useState("");
  const [italian, setItalian] = useState("");
  const [translationDistractors, setTranslationDistractors] = useState("");
  const [emoji, setEmoji] = useState("");
  const [transliteration, setTransliteration] = useState("");
  const [tags, setTags] = useState("tier:core, topic:community");
  const [stage, setStage] = useState(0);
  const [autoSaveAfterRecording, setAutoSaveAfterRecording] = useState(true);
  const [recordedAudio, setRecordedAudio] = useState<RecordedAudio | null>(null);
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const lastAutoSavedAudioRef = useRef<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number>(0);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const existingItem = useMemo(() => pack.items.find((item) => normalize(item.target) === normalize(target)), [pack.items, target]);
  const existingGrammar = useMemo(() => (pack.grammar_items ?? []).find((item) => normalize(item.target_sentence) === normalize(target)), [pack.grammar_items, target]);
  const existing = kind === "word" ? existingItem : existingGrammar;
  const selectedTagSet = useMemo(() => new Set(tags.split(",").map((tag) => tag.trim()).filter(Boolean)), [tags]);

  const filteredItems = useMemo(() => {
    const needle = normalize(query);
    const items = [...pack.items].sort((a, b) => a.target.localeCompare(b.target, "hy"));
    if (!needle) return items.slice(0, 100);
    return items.filter((item) => [item.target, item.transliteration, getItemTranslation(item, language), item.emoji, getItemTranslation(item, pack.source_language), ...(item.tags ?? [])].some((value) => normalize(value).includes(needle))).slice(0, 100);
  }, [pack.items, query, language]);

  const filteredGrammar = useMemo(() => {
    const needle = normalize(query);
    const items = [...(pack.grammar_items ?? [])].sort((a, b) => a.target_sentence.localeCompare(b.target_sentence, "hy"));
    if (!needle) return items.slice(0, 100);
    return items.filter((item) => [item.target_sentence, getGrammarTranslation(item, language), getGrammarTranslation(item, pack.source_language), ...(item.translation_distractors?.[pack.source_language] ?? []), ...(item.tags ?? [])].some((value) => normalize(value).includes(needle))).slice(0, 100);
  }, [pack.grammar_items, query, language]);

  useEffect(() => {
    if (!recordedAudio || !autoSaveAfterRecording || !target.trim()) return;
    if (lastAutoSavedAudioRef.current === recordedAudio.dataUrl) return;
    lastAutoSavedAudioRef.current = recordedAudio.dataUrl;
    mergeIntoBrowser("auto");
  }, [recordedAudio?.dataUrl, autoSaveAfterRecording, target]);

  async function startRecording() {
    setMessage(null);
    setRecordedAudio(null);
    if (!target.trim()) {
      setMessage(t(language, "adminMissingTarget"));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage(t(language, "adminRecordingUnsupported"));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          setRecordedAudio({ dataUrl: String(reader.result), mimeType, durationMs: Date.now() - startedAtRef.current });
        });
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((track) => track.stop());
      });
      recorder.start();
      setRecording(true);
    } catch {
      setMessage(t(language, "adminRecordingDenied"));
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  function toggleTag(tagId: string) {
    const next = new Set(selectedTagSet);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    setTags([...next].join(", "));
  }

  function createContribution(): ContentContribution | null {
    if (!target.trim()) {
      setMessage(t(language, "adminMissingTarget"));
      return null;
    }

    const cleanTarget = target.trim();
    const idSeed = slugify(transliteration || cleanTarget);
    const enteredTags = tags.split(",").map((tag) => tag.trim()).filter(Boolean).filter((tag) => !tag.startsWith("stage:"));
    const parsedTags = uniqueStrings([`stage:${Math.max(0, Math.min(8, Math.floor(stage || 0)))}`, ...enteredTags]);
    if (!parsedTags.some((tag) => tag.startsWith("tier:"))) parsedTags.push("tier:core");
    const audio = recordedAudio ? [audioContribution(cleanTarget, recordedAudio)] : [];
    const parsedTranslationDistractors = uniqueStrings(translationDistractors.split(/\r?\n/));

    return {
      schema_version: 1,
      pack_id: pack.pack_id,
      created_at: new Date().toISOString(),
      contributor_note: recordedAudio
        ? "Created with the in-app admin panel. Review before publishing."
        : "Created with the in-app admin panel. No human recording was included; browser TTS is recorded as a synthetic fallback.",
      items: kind === "word"
        ? [
            {
              id: existingItem?.id ?? `hy_${idSeed}`,
              target: cleanTarget,
              translation: italian.trim() || cleanTarget,
              translations: { [pack.source_language]: italian.trim() },
              emoji: emoji.trim(),
              transliteration: transliteration.trim(),
              tags: parsedTags,
              review_status: "needs_native_speaker_review",
              audio
            }
          ]
        : [],
      grammar_items: kind === "sentence"
        ? [
            {
              id: existingGrammar?.id ?? `hy_sentence_${idSeed}`,
              prompt: { [pack.source_language]: italian.trim() || cleanTarget },
              target_sentence: cleanTarget,
              translation: italian.trim() || cleanTarget,
              translations: { [pack.source_language]: italian.trim() },
              translation_distractors: parsedTranslationDistractors.length > 0 ? { [pack.source_language]: parsedTranslationDistractors } : undefined,
              distractors: makeSentenceDistractors(cleanTarget),
              tags: uniqueStrings([...parsedTags, "topic:sentences"]),
              review_status: "needs_native_speaker_review",
              audio
            }
          ]
        : []
    };
  }

  function downloadContribution() {
    const contribution = createContribution();
    if (!contribution) return;
    downloadJson(contribution, `${pack.pack_id}-${kind}-contribution-${Date.now()}.json`);
    setMessage(t(language, existing ? "adminWillAppend" : "adminWillCreate"));
  }

  function mergeIntoBrowser(source: "manual" | "auto" = "manual") {
    if (recording) {
      setMessage(t(language, "adminWaitForRecording"));
      return;
    }
    const contribution = createContribution();
    if (!contribution) return;
    const summary = onMergeContribution(contribution);
    setRecordedAudio(null);
    setMessage(t(language, source === "auto" ? "adminAutoMergedLocal" : "adminMergedLocal", formatSummary(summary)));
  }

  async function importContributionFile(file: File | undefined) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ContentContribution;
      const summary = onMergeContribution(parsed);
      setMessage(t(language, "adminImported", formatSummary(summary)));
    } catch {
      setMessage(t(language, "adminImportFailed"));
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  function loadWord(item: LearningItem) {
    setKind("word");
    setTarget(item.target);
    setItalian(item.translations?.[pack.source_language] ?? "");
    setTranslationDistractors("");
    setEmoji(item.emoji ?? "");
    setTransliteration(item.transliteration ?? "");
    setStage(stageFromTags(item.tags));
    setTags((item.tags ?? []).filter((tag) => !tag.startsWith("stage:")).join(", "));
    setRecordedAudio(null);
    setMessage(t(language, "adminLoadedExisting"));
  }

  function loadSentence(item: GrammarItem) {
    setKind("sentence");
    setTarget(item.target_sentence);
    setItalian(item.translations?.[pack.source_language] ?? item.translation ?? "");
    setTranslationDistractors((item.translation_distractors?.[pack.source_language] ?? []).join("\n"));
    setEmoji("");
    setTransliteration("");
    setStage(stageFromTags(item.tags));
    setTags((item.tags ?? []).filter((tag) => !tag.startsWith("stage:")).join(", "));
    setRecordedAudio(null);
    setMessage(t(language, "adminLoadedExisting"));
  }

  return (
    <section className="admin-panel" role="dialog" aria-label={t(language, "admin")}>
      <div className="sheet-handle" />
      <div className="panel-heading compact">
        <span>{t(language, "admin")}</span>
        <strong>{t(language, "adminTitle")}</strong>
      </div>
      <p className="sheet-intro">{t(language, "adminIntro")}</p>

      <div className="admin-tabs" role="tablist" aria-label={t(language, "adminContributionType")}>
        <button type="button" className={kind === "word" ? "active" : ""} onClick={() => setKind("word")}>{t(language, "adminWord")}</button>
        <button type="button" className={kind === "sentence" ? "active" : ""} onClick={() => setKind("sentence")}>{t(language, "adminSentence")}</button>
      </div>

      <div className="admin-form-grid">
        <label>
          <span>{kind === "word" ? t(language, "adminArmenianWord") : t(language, "adminArmenianSentence")}</span>
          <input value={target} onChange={(event: ChangeEvent<HTMLInputElement>) => setTarget(event.target.value)} lang="hy" placeholder={kind === "word" ? "բարև" : "Սա իմ տունն է։"} />
        </label>
        <label>
          <span>{t(language, "adminItalian")}</span>
          <input value={italian} onChange={(event: ChangeEvent<HTMLInputElement>) => setItalian(event.target.value)} placeholder="ciao" />
        </label>
        {kind === "sentence" ? (
          <label className="wide">
            <span>{t(language, "adminTranslationDistractors")}</span>
            <textarea
              value={translationDistractors}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setTranslationDistractors(event.target.value)}
              placeholder={"Tu vai a scuola.\nIo non vado a scuola.\nIo torno da scuola."}
              rows={4}
            />
            <small className="field-hint">{t(language, "adminTranslationDistractorsHint")}</small>
          </label>
        ) : null}
        {kind === "word" ? (
          <label>
            <span>{t(language, "adminEmoji")}</span>
            <input value={emoji} onChange={(event: ChangeEvent<HTMLInputElement>) => setEmoji(event.target.value)} placeholder="🐶" />
          </label>
        ) : null}
        <label>
          <span>{t(language, "adminTransliteration")}</span>
          <input value={transliteration} onChange={(event: ChangeEvent<HTMLInputElement>) => setTransliteration(event.target.value)} placeholder="barev" />
        </label>
        <label>
          <span>{t(language, "adminStage")}</span>
          <select value={stage} onChange={(event: ChangeEvent<HTMLSelectElement>) => setStage(Number(event.target.value))}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="wide">
          <span>{t(language, "adminTags")}</span>
          <input value={tags} onChange={(event: ChangeEvent<HTMLInputElement>) => setTags(event.target.value)} placeholder="family, greeting" />
        </label>
        {pack.controlled_tags && pack.controlled_tags.length > 0 ? (
          <div className="tag-chip-panel wide" aria-label={t(language, "adminTags")}>
            {pack.controlled_tags.filter((tag) => !tag.id.startsWith("stage:")).map((tag) => (
              <button key={tag.id} type="button" className={selectedTagSet.has(tag.id) ? "tag-chip active" : "tag-chip"} onClick={() => toggleTag(tag.id)} title={tag.description ?? tag.label}>
                {tag.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {existing ? (
        <div className="admin-existing-note">
          {t(language, "adminDuplicateFound")} <strong>{existing.id}</strong>. {t(language, "adminDuplicateAudio")}
        </div>
      ) : null}

      <div className="recording-card">
        <div>
          <span>{t(language, "adminAudio")}</span>
          <strong>{recording ? t(language, "adminRecording") : recordedAudio ? t(language, "adminRecorded") : t(language, "adminNoRecording")}</strong>
          {!recordedAudio ? <p>{t(language, "adminAutoAudioHint")}</p> : null}
        </div>
        <label className="toggle-row compact-toggle">
          <input type="checkbox" checked={autoSaveAfterRecording} onChange={(event: ChangeEvent<HTMLInputElement>) => setAutoSaveAfterRecording(event.target.checked)} />
          <span>{t(language, "adminAutoSaveRecording")}</span>
        </label>
        <div className="recording-actions">
          {!recording ? (
            <button type="button" className="small-button" onClick={startRecording}>● {t(language, "adminRecord")}</button>
          ) : (
            <button type="button" className="small-button danger" onClick={stopRecording}>■ {t(language, "adminStop")}</button>
          )}
          {recordedAudio ? <audio controls src={recordedAudio.dataUrl} /> : null}
        </div>
      </div>

      <div className="admin-actions admin-actions-wide">
        <button type="button" className="primary-button" disabled={recording} onClick={() => mergeIntoBrowser("manual")}>{recordedAudio ? t(language, "adminSaveAudioNow") : t(language, "adminMergeLocal")}</button>
        <button type="button" className="ghost-button" onClick={downloadContribution}>{t(language, "adminDownload")}</button>
        <button type="button" className="ghost-button" onClick={() => importInputRef.current?.click()}>{t(language, "adminImportMerge")}</button>
        <button type="button" className="ghost-button" onClick={onExportPack}>{t(language, "adminExportPack")}</button>
        <button type="button" className="ghost-button danger-text" onClick={onResetLocalPack}>{t(language, "adminResetLocal")}</button>
        <button type="button" className="ghost-button" onClick={onClose}>{t(language, "close")}</button>
      </div>
      <input ref={importInputRef} type="file" accept="application/json,.json" hidden onChange={(event: ChangeEvent<HTMLInputElement>) => void importContributionFile(event.target.files?.[0])} />
      {message ? <div className="inline-feedback correct">{message}</div> : null}

      <div className="community-merge-card">
        <strong>{t(language, "communityMergeTitle")}</strong>
        <p>{t(language, "communityMergeBody")}</p>
      </div>

      <details className="vocab-details" open>
        <summary>{t(language, "adminCurrentVocabulary")}</summary>
        <label className="vocab-search">
          <span>{t(language, "adminSearch")}</span>
          <input value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder={t(language, "adminSearchPlaceholder")} />
        </label>
        <div className="vocab-table">
          {filteredItems.map((item) => {
            const human = item.audio.filter((audio) => audio.source_type === "human").length;
            const automated = item.audio.filter((audio) => audio.source_type === "automated" || audio.source_type === "browser_tts").length;
            return (
              <button key={item.id} type="button" className="vocab-row clickable" onClick={() => loadWord(item)}>
                <strong lang="hy">{item.target}</strong>
                <span>{getItemTranslation(item, language)}</span>
                <small>{t(language, "adminStageShort")} {stageFromTags(item.tags)} · {item.tags?.filter((tag) => !tag.startsWith("stage:")).slice(0, 2).join(", ")} · {human} human / {automated} auto</small>
              </button>
            );
          })}
          {filteredGrammar.map((item) => {
            const human = item.audio.filter((audio) => audio.source_type === "human").length;
            const automated = item.audio.filter((audio) => audio.source_type === "automated" || audio.source_type === "browser_tts").length;
            return (
              <button key={item.id} type="button" className="vocab-row clickable sentence-row" onClick={() => loadSentence(item)}>
                <strong lang="hy">{item.target_sentence}</strong>
                <span>{getGrammarTranslation(item, language)}</span>
                <small>{t(language, "adminStageShort")} {stageFromTags(item.tags)} · {item.tags?.filter((tag) => !tag.startsWith("stage:")).slice(0, 2).join(", ")} · {human} human / {automated} auto</small>
              </button>
            );
          })}
        </div>
      </details>
    </section>
  );
}

function audioContribution(text: string, audio: RecordedAudio) {
  return {
    text,
    data_url: audio.dataUrl,
    mime_type: audio.mimeType,
    duration_ms: audio.durationMs,
    speaker_label: "Community speaker",
    source_type: "human" as const,
    license: "CC-BY-4.0",
    review_status: "needs_native_speaker_review" as const
  };
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

function formatSummary(summary: MergeSummary): Record<string, number> {
  return {
    items: summary.addedItems + summary.updatedItems,
    grammar: summary.addedGrammar + summary.updatedGrammar,
    audio: summary.addedAudio + summary.addedBrowserTts
  };
}

function stageFromTags(tags: string[] | undefined): number {
  const value = tags?.find((tag) => /^stage:\d+$/.test(tag));
  return Math.max(0, Math.min(8, Number(value?.slice("stage:".length) ?? 0)));
}

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function slugify(value: string): string {
  const ascii = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const slug = ascii.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return slug || Math.random().toString(36).slice(2, 8);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim()).map((value) => value.trim()))];
}

function downloadJson(value: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
