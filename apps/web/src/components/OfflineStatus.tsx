import type { OfflineState } from "../offline";
import { t } from "../i18n";

export function OfflineStatus({ state, language }: { state: OfflineState; language: string }) {
  if (!state.supported) return null;
  const progress = state.total > 0 ? Math.round((state.completed / state.total) * 100) : 0;
  if (state.updateAvailable) {
    return <button type="button" className="offline-pill update" onClick={state.applyUpdate}>↻ {t(language, "offlineUpdate")}</button>;
  }
  if (state.installing) return <span className="offline-pill installing">↓ {t(language, "offlinePreparing")} {progress}%</span>;
  if (!state.online) return <span className="offline-pill ready">✓ {t(language, "offlineMode")}</span>;
  if (state.ready) return <span className="offline-pill ready">✓ {t(language, "offlineReady")}</span>;
  return <span className="offline-pill">○ {t(language, "offlinePreparing")}</span>;
}
