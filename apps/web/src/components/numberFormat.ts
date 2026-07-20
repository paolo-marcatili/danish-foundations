export function formatGameNumber(value: number): string {
  if (!Number.isFinite(value)) return "∞";
  const rounded = Math.max(0, Math.round(value));
  if (rounded < 10_000) return String(rounded);
  const units = [
    { value: 1_000_000_000_000, suffix: "T" },
    { value: 1_000_000_000, suffix: "B" },
    { value: 1_000_000, suffix: "M" },
    { value: 1_000, suffix: "K" }
  ];
  const unit = units.find((entry) => rounded >= entry.value);
  if (!unit) return String(rounded);
  const scaled = rounded / unit.value;
  return `${scaled >= 100 ? scaled.toFixed(0) : scaled >= 10 ? scaled.toFixed(1) : scaled.toFixed(2)}${unit.suffix}`;
}
