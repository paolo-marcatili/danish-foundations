import { useState } from "react";
import type { LanguagePack, StoryMilestone } from "@hero-lang/content-schema";
import { getLocalizedText } from "@hero-lang/content-schema";
import type { HeroStatKey, LearnerState } from "@hero-lang/learning-engine";
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
  const denominator = Math.max(1, story.milestones.length);
  const availableChapters = (story.chapters ?? []).filter((chapter) => !chapter.minimum_level || state.level >= chapter.minimum_level);

  return (
    <section className={`next-task-panel ${expanded ? "expanded" : ""}`} aria-label={t(language, "nextTask")}>
      <div className="story-progress-track" aria-label={t(language, "storyProgress")}>
        <div className="story-progress-fill" style={{ width: `${(completedCount / denominator) * 100}%` }} />
      </div>
      {nextMilestone ? (
        <div className="next-task-card">
          <span>{t(language, "nextTask")}</span>
          <strong>{getLocalizedText(nextMilestone.title, language, nextMilestone.id)}</strong>
          <p>{getLocalizedText(nextMilestone.description, language, "")}</p>
          <div className="task-pill">{getLocalizedText(nextMilestone.task_label, language, "")}</div>
        </div>
      ) : (
        <div className="next-task-card complete">
          <span>{t(language, "sessionComplete")}</span>
          <strong>{getLocalizedText(story.title, language, "Story")}</strong>
          <p>{getLocalizedText(story.opening, language, "")}</p>
        </div>
      )}
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
