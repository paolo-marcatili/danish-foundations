import type { ReactNode } from "react";

interface HomeDashboardProps {
  content: ReactNode;
  actions: ReactNode;
  mode?: "overview" | "training" | "shop";
}

/**
 * Contextual home column shown beside the side-scroller. Actions have their
 * own reserved row, so they never overlap the canvas on desktop or phones.
 */
export function HomeDashboard({ content, actions, mode = "overview" }: HomeDashboardProps) {
  return (
    <section className={`home-dashboard mode-${mode}`}>
      <div className="home-dashboard-scroll">{content}</div>
      <nav className="home-dashboard-actions" aria-label="Main actions">{actions}</nav>
    </section>
  );
}
