import type { LearnerState } from "@hero-lang/learning-engine";
import { getAverageMastery } from "@hero-lang/learning-engine";
import { t } from "../i18n";
import { formatGameNumber } from "./numberFormat";

interface HeroStatsPanelProps {
  state: LearnerState;
  language: string;
  statCap: number;
}

export function HeroStatsPanel({ state, language, statCap }: HeroStatsPanelProps) {
  const stats = state.hero_stats;
  const mastery = Math.round(getAverageMastery(state) * 100);
  const cap = statCap;

  return (
    <section className="hero-status-card" aria-label="Hero stats">
      <div className="hero-status-top">
        <div>
          <span>{t(language, "hero")}</span>
          <strong>{state.hero_name}</strong>
        </div>
        <div className="coin-pill">🪙 {formatGameNumber(state.coins)}</div>
      </div>
      <div className="hero-core-stats">
        <div><span>{t(language, "level")}</span><strong>{state.level}</strong></div>
        <div><span>{t(language, "xp")}</span><strong>{formatGameNumber(state.xp)}</strong></div>
        <div><span>{t(language, "mastery")}</span><strong>{mastery}%</strong></div>
        <div><span>{t(language, "statCap")}</span><strong>{formatGameNumber(cap)}</strong></div>
      </div>
      <div className="attribute-list compact-attributes">
        <StatBar label={t(language, "strength")} value={stats.strength} cap={cap} icon="💪" />
        <StatBar label={t(language, "defense")} value={stats.defense} cap={cap} icon="🛡️" />
        <StatBar label={t(language, "precision")} value={stats.precision} cap={cap} icon="🎯" />
        <StatBar label={t(language, "stamina")} value={stats.stamina} cap={cap} icon="❤️" />
      </div>
    </section>
  );
}

function StatBar({ label, value, cap, icon }: { label: string; value: number; cap: number; icon: string }) {
  const percent = Math.min(100, Math.max(8, (value / cap) * 100));
  return (
    <div className="stat-bar-row">
      <div className="stat-bar-label"><span>{icon} {label}</span><strong>{formatGameNumber(value)}/{formatGameNumber(cap)}</strong></div>
      <div className="stat-bar-track"><div className="stat-bar-fill" style={{ width: `${percent}%` }} /></div>
    </div>
  );
}
