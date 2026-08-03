import { useEffect, useRef, useState } from "react";

interface QuestionTimerProps {
  durationSeconds: number;
  active: boolean;
  resetKey: string;
  label: string;
}

/**
 * A soft speed-bonus meter. Reaching zero never submits the question and never
 * makes an answer wrong; it only means that the learner receives normal damage.
 */
export function QuestionTimer({ durationSeconds, active, resetKey, label }: QuestionTimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);

  const previousTick = useRef<number | null>(null);

  useEffect(() => {
    setRemaining(durationSeconds);
    previousTick.current = null;
  }, [durationSeconds, resetKey]);

  useEffect(() => {
    if (!active) {
      previousTick.current = null;
      return;
    }

    previousTick.current = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const previous = previousTick.current ?? now;
      previousTick.current = now;
      setRemaining((value) => Math.max(0, value - (now - previous) / 1000));
    }, 100);

    return () => window.clearInterval(interval);
  }, [active, resetKey]);

  const percent = Math.max(0, Math.min(100, (remaining / Math.max(1, durationSeconds)) * 100));

  return (
    <div className="timer speed-bonus-meter" aria-label={`${label}: ${Math.ceil(remaining)} seconds`}>
      <div className="timer-topline">
        <span>{label}</span>
        <strong>{active ? `${Math.ceil(remaining)}s` : "—"}</strong>
      </div>
      <div className="timer-track">
        <div className="timer-fill" style={{ width: `${active ? percent : 100}%` }} />
      </div>
    </div>
  );
}
