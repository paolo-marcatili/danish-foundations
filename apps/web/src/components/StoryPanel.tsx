import { useEffect, useMemo, useState } from "react";
import type { LanguagePack, StoryChapter, StoryMilestone } from "@hero-lang/content-schema";
import { getLocalizedText } from "@hero-lang/content-schema";
import { getLevelConfig, type HeroStatKey, type LearnerState } from "@hero-lang/learning-engine";
import { t } from "../i18n";

interface StoryPanelProps {
  pack: LanguagePack;
  state: LearnerState;
  language: string;
}

export function StoryPanel({ pack, state, language }: StoryPanelProps) {
  const [readerOpen, setReaderOpen] = useState(false);
  const story = pack.story;
  const availableChapters = useMemo(
    () => (story?.chapters ?? []).filter((chapter) => chapter.minimum_level === undefined || state.level >= chapter.minimum_level),
    [story?.chapters, state.level]
  );
  const currentLevel = getLevelConfig(pack, state.level);
  const currentChapter = availableChapters.find((chapter) => chapter.id === currentLevel?.chapter_id)
    ?? availableChapters[availableChapters.length - 1];
  const [expandedChapterId, setExpandedChapterId] = useState<string | undefined>(currentChapter?.id);

  useEffect(() => {
    if (currentChapter?.id) setExpandedChapterId(currentChapter.id);
  }, [currentChapter?.id]);

  useEffect(() => {
    if (!readerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReaderOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [readerOpen]);

  if (!story || !currentChapter) return null;
  const nextMilestone = story.milestones.find((milestone) => !isMilestoneComplete(milestone, state));
  const completedCount = story.milestones.filter((milestone) => isMilestoneComplete(milestone, state)).length;
  const maxLevel = Math.max(0, ...(pack.levels ?? []).map((level) => level.number));
  const storyProgress = story.milestones.length > 0
    ? completedCount / Math.max(1, story.milestones.length)
    : Math.min(1, (state.level + 1) / Math.max(1, maxLevel + 1));

  return (
    <>
      <section className="next-task-panel chapter-summary-card" aria-label={t(language, "currentChapter")}>
        <div className="story-progress-track" aria-label={t(language, "storyProgress")}>
          <div className="story-progress-fill" style={{ width: `${storyProgress * 100}%` }} />
        </div>
        <div className="chapter-summary-copy">
          <span>{t(language, "currentChapter")}</span>
          <strong>{getLocalizedText(currentChapter.title, language, currentChapter.id)}</strong>
          <p>{getLocalizedText(currentChapter.summary, language, getLocalizedText(currentChapter.mission, language, ""))}</p>
          <div className="task-pill">
            {nextMilestone
              ? getLocalizedText(nextMilestone.task_label, language, "")
              : getLocalizedText(currentChapter.mission, language, currentLevel?.title ?? "")}
          </div>
        </div>
        <button
          type="button"
          className="chapter-open-button"
          onClick={() => setReaderOpen(true)}
          aria-label={t(language, "openChapterReader")}
          title={t(language, "openChapterReader")}
        >
          <span aria-hidden="true">＋</span>
          <small>{t(language, "readChapter")}</small>
        </button>
      </section>

      {readerOpen ? (
        <div className="story-reader-overlay" role="dialog" aria-modal="true" aria-label={t(language, "chapterReaderTitle")}>
          <div className="story-reader-window">
            <header className="story-reader-header">
              <div>
                <span>{t(language, "chapterReaderTitle")}</span>
                <h2>{getLocalizedText(story.title, language, t(language, "story"))}</h2>
              </div>
              <button type="button" className="story-reader-close" onClick={() => setReaderOpen(false)} aria-label={t(language, "close")}>×</button>
            </header>
            <div className="story-reader-intro">{getLocalizedText(story.opening, language, "")}</div>
            <div className="story-chapter-list">
              {[...availableChapters].reverse().map((chapter) => {
                const expanded = expandedChapterId === chapter.id;
                const isCurrent = chapter.id === currentChapter.id;
                return (
                  <article key={chapter.id} className={`story-chapter${expanded ? " expanded" : ""}${isCurrent ? " current" : ""}`}>
                    <button
                      type="button"
                      className="story-chapter-toggle"
                      aria-expanded={expanded}
                      onClick={() => setExpandedChapterId(expanded ? undefined : chapter.id)}
                    >
                      <span>{isCurrent ? t(language, "currentChapter") : t(language, "previousChapter")}</span>
                      <strong>{getLocalizedText(chapter.title, language, chapter.id)}</strong>
                      <em aria-hidden="true">{expanded ? "−" : "+"}</em>
                    </button>
                    {expanded ? <ChapterContent chapter={chapter} language={language} /> : null}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ChapterContent({ chapter, language }: { chapter: StoryChapter; language: string }) {
  const lesson = chapter.lesson;
  return (
    <div className="story-chapter-content">
      {chapter.fiction ? (
        <section className="story-fiction-section">
          <div className="story-section-kicker">✦ {t(language, "chapterStory")}</div>
          {paragraphs(getLocalizedText(chapter.fiction, language, "")).map((paragraph, index) => <p key={`fiction:${index}`}>{paragraph}</p>)}
        </section>
      ) : null}
      {lesson ? (
        <section className="story-lesson-section">
          <div className="story-section-kicker">📖 {t(language, "chapterLesson")}</div>
          <h3>{getLocalizedText(lesson.title, language, "")}</h3>
          {lesson.objectives?.length ? (
            <ul className="story-objective-list">
              {lesson.objectives.map((objective, index) => <li key={`objective:${index}`}>{getLocalizedText(objective, language, "")}</li>)}
            </ul>
          ) : null}
          {paragraphs(getLocalizedText(lesson.explanation, language, "")).map((paragraph, index) => <p key={`lesson:${index}`}>{paragraph}</p>)}
          {lesson.examples?.length ? (
            <div className="story-example-list">
              {lesson.examples.map((example) => (
                <div key={example.target} className="story-example-card">
                  <strong lang="hy">{example.target}</strong>
                  {example.transliteration ? <span>{example.transliteration}</span> : null}
                  <p>{getLocalizedText(example.translation, language, "")}</p>
                  {example.note ? <small>{getLocalizedText(example.note, language, "")}</small> : null}
                </div>
              ))}
            </div>
          ) : null}
          {lesson.common_mistakes?.length ? (
            <div className="story-mistakes-card">
              <strong>{t(language, "watchOut")}</strong>
              <ul>{lesson.common_mistakes.map((mistake, index) => <li key={`mistake:${index}`}>{getLocalizedText(mistake, language, "")}</li>)}</ul>
            </div>
          ) : null}
        </section>
      ) : chapter.body ? (
        <section>{paragraphs(getLocalizedText(chapter.body, language, "")).map((paragraph, index) => <p key={`body:${index}`}>{paragraph}</p>)}</section>
      ) : null}
      {chapter.mission ? (
        <section className="story-mission-card">
          <div className="story-section-kicker">⚑ {t(language, "chapterMission")}</div>
          <p>{getLocalizedText(chapter.mission, language, "")}</p>
        </section>
      ) : null}
    </div>
  );
}

function paragraphs(value: string): string[] {
  return value.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
}

export function isMilestoneComplete(milestone: StoryMilestone, state: LearnerState): boolean {
  if (milestone.kind === "fight" && milestone.target_enemy_id) return state.defeated_enemies.includes(milestone.target_enemy_id);
  if (milestone.kind === "level" && typeof milestone.target_value === "number") return state.level >= milestone.target_value;
  if (milestone.kind === "coins" && typeof milestone.target_value === "number") return state.coins >= milestone.target_value;
  if (milestone.kind === "shop") return state.inventory.length > 0;
  if (milestone.kind === "train" && milestone.target_stat && typeof milestone.target_value === "number") {
    const statName = milestone.target_stat as HeroStatKey;
    return (state.hero_stats[statName] ?? 0) >= milestone.target_value;
  }
  return false;
}
