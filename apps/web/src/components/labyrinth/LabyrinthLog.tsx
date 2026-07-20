import { useEffect, useRef } from "react";
import type { LabyrinthLogEntry } from "../../labyrinth";
import { t } from "../../i18n";

interface LabyrinthLogProps {
  entries: readonly LabyrinthLogEntry[];
  language: string;
}

const TONE_ICON: Record<LabyrinthLogEntry["tone"], string> = {
  story: "✦",
  success: "✓",
  danger: "!",
  reward: "★",
  discovery: "◇"
};

export function LabyrinthLog({ entries, language }: LabyrinthLogProps) {
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [entries.length]);

  return (
    <section className="labyrinth-log" aria-label={t(language, "labyrinthStoryLog")}>
      <header><span>{t(language, "labyrinthStoryLog")}</span><small>{entries.length}</small></header>
      <div className="labyrinth-log-list">
        {entries.length === 0 ? <p className="labyrinth-log-empty">{t(language, "labyrinthLogEmpty")}</p> : entries.map((entry) => (
          <article key={entry.id} className={`labyrinth-log-entry tone-${entry.tone}`}>
            <span className="labyrinth-log-icon" aria-hidden="true">{TONE_ICON[entry.tone]}</span>
            <p>{t(language, entry.key, entry.params)}</p>
          </article>
        ))}
        <div ref={endRef} />
      </div>
    </section>
  );
}
