import type { LanguagePack } from "@hero-lang/content-schema";
import type { LearnerState, PracticeMemory } from "@hero-lang/foundations-engine";
import { t } from "../../../web/src/i18n";

interface Props {
  pack: LanguagePack;
  state: LearnerState;
  language: string;
  onClose: () => void;
}

export function ParentProgressPanel({ pack, state, language, onClose }: Props) {
  const introducedLetters = (pack.letters ?? []).filter((entry) => stageOf(entry.tags ?? []) <= state.level);
  const introducedWords = pack.items.filter((entry) => stageOf(entry.tags) <= state.level);
  const introducedReading = (pack.reading_problems ?? []).filter((entry) => stageOf(entry.tags) <= state.level);
  const introducedMath = (pack.math_problems ?? []).filter((entry) => stageOf(entry.tags) <= state.level);
  const levelSessions = state.completed_training_sessions_by_level?.[String(state.level)] ?? {};

  const cards = [
    summary("🔤", t(language, "progressLetters"), introducedLetters.length, introducedLetters.filter((entry) => mastered(state.mastery_by_letter[entry.id])).length),
    summary("📖", t(language, "progressWords"), introducedWords.length, introducedWords.filter((entry) => mastered(state.mastery_by_item[entry.id])).length),
    summary("📝", t(language, "progressReading"), introducedReading.length, introducedReading.filter((entry) => mastered(state.mastery_by_grammar[entry.id])).length),
    summary("🧮", t(language, "progressMath"), introducedMath.length, introducedMath.filter((entry) => mastered(state.mastery_by_grammar[entry.id])).length)
  ];

  const reviewItems = [
    ...introducedLetters.map((entry) => ({ label: `${entry.uppercase ?? entry.character} ${entry.lowercase ?? entry.character}`, memory: state.mastery_by_letter[entry.id] })),
    ...introducedWords.map((entry) => ({ label: entry.target, memory: state.mastery_by_item[entry.id] }))
  ].filter((entry) => (entry.memory?.mastery ?? 0) < 0.55).sort((a, b) => (a.memory?.mastery ?? 0) - (b.memory?.mastery ?? 0)).slice(0, 8);

  return (
    <section className="parent-progress-panel" role="dialog" aria-modal="true" aria-label={t(language, "parentProgress")}>
      <header className="parent-progress-header">
        <div><span className="eyebrow">{t(language, "parentArea")}</span><h2>{t(language, "parentProgress")}</h2></div>
        <button type="button" className="icon-button" onClick={onClose} aria-label={t(language, "close")}>✕</button>
      </header>
      <p className="parent-progress-intro">{t(language, "progressIntro")}</p>
      <div className="parent-progress-grid">
        {cards.map((card) => <article key={card.label} className="parent-progress-card"><span>{card.icon}</span><strong>{card.label}</strong><b>{card.mastered} / {card.total}</b><div className="parent-progress-meter"><i style={{ width: `${card.percent}%` }} /></div></article>)}
      </div>
      <section className="parent-progress-section">
        <h3>{t(language, "currentChapterActivity")}</h3>
        <div className="parent-session-grid">
          <span>🔤 {levelSessions.vocabulary ?? 0}</span><span>📖 {levelSessions.comprehension ?? 0}</span><span>🔢 {levelSessions.grammar ?? 0}</span><span>➕ {levelSessions.pronunciation ?? 0}</span>
        </div>
      </section>
      <section className="parent-progress-section">
        <h3>{t(language, "suggestedReview")}</h3>
        {reviewItems.length ? <div className="review-chip-list">{reviewItems.map((entry) => <span key={entry.label}>{entry.label}</span>)}</div> : <p>{t(language, "noUrgentReview")}</p>}
      </section>
      <p className="parent-progress-note">{t(language, "progressNotGrade")}</p>
    </section>
  );
}

function stageOf(tags: string[]): number {
  const tag = tags.find((entry) => entry.startsWith("stage:"));
  const value = Number(tag?.slice(6));
  return Number.isFinite(value) ? value : 0;
}
function mastered(memory: PracticeMemory | undefined): boolean { return (memory?.mastery ?? 0) >= 0.72; }
function summary(icon: string, label: string, total: number, masteredCount: number) { return { icon, label, total, mastered: masteredCount, percent: total ? Math.round(masteredCount / total * 100) : 0 }; }
