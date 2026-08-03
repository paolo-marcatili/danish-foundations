import { useState } from "react";
import type { LanguagePack, StoryMilestone } from "@hero-lang/content-schema";
import { getLocalizedText } from "@hero-lang/content-schema";
import { getLevelConfig, type HeroStatKey, type LearnerState } from "@hero-lang/learning-engine";
import { t } from "../i18n";

interface StoryPanelProps {
  pack: LanguagePack;
  state: LearnerState;
  language: string;
}

export function StoryPanel({ pack, state, language }: StoryPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const story = pack.story;
  if (!story) return null;
  const nextMilestone = story.milestones.find((milestone) => !isMilestoneComplete(milestone, state));
  const completedCount = story.milestones.filter((milestone) => isMilestoneComplete(milestone, state)).length;
  const maxLevel = Math.max(0, ...(pack.levels ?? []).map((level) => level.number));
  const storyProgress = story.milestones.length > 0
    ? completedCount / Math.max(1, story.milestones.length)
    : Math.min(1, (state.level + 1) / Math.max(1, maxLevel + 1));
  const availableChapters = (story.chapters ?? []).filter((chapter) => chapter.minimum_level === undefined || state.level >= chapter.minimum_level);
  const currentLevel = getLevelConfig(pack, state.level);

  return (
    <section className={`next-task-panel ${expanded ? "expanded" : ""}`} aria-label={t(language, "nextTask")}>
      <div className="story-progress-track" aria-label={t(language, "storyProgress")}>
        <div className="story-progress-fill" style={{ width: `${storyProgress * 100}%` }} />
      </div>
      {nextMilestone ? (
        <div className="next-task-card">
          <span>{t(language, "nextTask")}</span>
          <strong>{getLocalizedText(nextMilestone.title, language, nextMilestone.id)}</strong>
          <p>{getLocalizedText(nextMilestone.description, language, "")}</p>
          <div className="task-pill">{getLocalizedText(nextMilestone.task_label, language, "")}</div>
        </div>
      ) : currentLevel ? (
        <div className="next-task-card">
          <span>{t(language, "nextTask")}</span>
          <strong>{getLocalizedText(currentLevel.theme, language, currentLevel.title)}</strong>
          <p>{getLocalizedText(currentLevel.learning_goal, language, currentLevel.title)}</p>
          <div className="task-pill">{t(language, "trainingMenuTitle")}</div>
        </div>
      ) : (
        <div className="next-task-card complete">
          <span>{t(language, "sessionComplete")}</span>
          <strong>{getLocalizedText(story.title, language, "Story")}</strong>
          <p>{getLocalizedText(story.opening, language, "")}</p>
        </div>
      )}
      {currentLevel ? (
        <div className="level-learning-card">
          <span>{getLocalizedText(currentLevel.theme, language, currentLevel.title)}</span>
          <strong>{getLocalizedText(currentLevel.learning_goal, language, currentLevel.title)}</strong>
          <p><b>{getLocalizedText(currentLevel.grammar_title, language, "")}</b> {getLocalizedText(currentLevel.grammar_note, language, "")}</p>
          <div className="grammar-example-list">
            {(currentLevel.grammar_examples ?? []).map((example) => (
              <div key={example.target} className="grammar-example">
                <b lang="hy">{example.target}</b>
                <span>{getLocalizedText(example.translation, language, "")}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <button type="button" className="story-expand-button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
        {expanded ? t(language, "storyCollapse") : t(language, "storyExpand")}
      </button>
      {expanded ? (
        <div className="story-full-text">
          <h3>{getLocalizedText(story.title, language, t(language, "story"))}</h3>
          <p>{getLocalizedText(story.opening, language, "")}</p>
          {availableChapters.map((chapter) => (
            <article key={chapter.id}>
              <h4>{getLocalizedText(chapter.title, language, chapter.id)}</h4>
              {getLocalizedText(chapter.body, language, "").split(/\n{2,}/).filter(Boolean).map((paragraph, index) => <p key={`${chapter.id}:${index}`}>{paragraph}</p>)}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
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
