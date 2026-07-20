import { t } from "../i18n";
import { formatGameNumber } from "./numberFormat";

interface EnergyBarsProps {
  language: string;
  heroEnergy: number;
  heroMaxEnergy: number;
  enemyName: string;
  enemyEnergy: number;
  enemyMaxEnergy: number;
}

export function EnergyBars({ language, heroEnergy, heroMaxEnergy, enemyName, enemyEnergy, enemyMaxEnergy }: EnergyBarsProps) {
  return (
    <section className="energy-panel" aria-label="Fight energy">
      <EnergyBar label={t(language, "hero")} value={heroEnergy} max={heroMaxEnergy} />
      <EnergyBar label={enemyName} value={enemyEnergy} max={enemyMaxEnergy} enemy />
    </section>
  );
}

function EnergyBar({ label, value, max, enemy = false }: { label: string; value: number; max: number; enemy?: boolean }) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`energy-row${enemy ? " enemy" : ""}`}>
      <div className="energy-label"><span>{label}</span><strong>{formatGameNumber(Math.max(0, Math.ceil(value)))}/{formatGameNumber(max)}</strong></div>
      <div className="energy-track"><div className="energy-fill" style={{ width: `${percent}%` }} /></div>
    </div>
  );
}
