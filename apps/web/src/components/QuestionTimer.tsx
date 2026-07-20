import { useEffect, useRef, useState } from "react";

interface QuestionTimerProps {
  durationSeconds: number;
  active: boolean;
  resetKey: string;
  onExpire: () => void;
  label: string;
}

export function QuestionTimer({ durationSeconds, active, resetKey, onExpire, label }: QuestionTimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    setRemaining(durationSeconds);
    if (!active) return;

    const startedAt = performance.now();
    let expired = false;
    const interval = window.setInterval(() => {
      const elapsed = (performance.now() - startedAt) / 1000;
      const nextRemaining = Math.max(0, durationSeconds - elapsed);
      setRemaining(nextRemaining);

      if (!expired && nextRemaining <= 0) {
        expired = true;
        window.clearInterval(interval);
        onExpireRef.current();
      }
    }, 80);

    return () => window.clearInterval(interval);
  }, [active, durationSeconds, resetKey]);

  const percent = Math.max(0, Math.min(100, (remaining / durationSeconds) * 100));

  return (
    <div className="timer" aria-label={`${label}: ${Math.ceil(remaining)} seconds`}>
      <div className="timer-topline">
        <span>{label}</span>
        <strong>{Math.ceil(remaining)}s</strong>
      </div>
      <div className="timer-track">
        <div className="timer-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
