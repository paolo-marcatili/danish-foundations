import type { ReactNode } from "react";

interface SessionLayoutProps {
  active: boolean;
  world: ReactNode;
  panel: ReactNode;
}

/**
 * Keeps the renderer and contextual panel in one stable shell. The world is
 * never re-parented when a session starts, which prevents Phaser resize jitter.
 */
export function SessionLayout({ active, world, panel }: SessionLayoutProps) {
  return (
    <section className={`game-session-layout ${active ? "active" : "idle"}`}>
      <div className="game-session-world">{world}</div>
      <aside className="game-session-panel">{panel}</aside>
    </section>
  );
}
