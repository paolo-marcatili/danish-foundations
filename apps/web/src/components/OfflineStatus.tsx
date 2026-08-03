import type { OfflineState } from "../offline";
import { t } from "../i18n";

export function OfflineStatus({ state, language }: { state: OfflineState; language: string }) {
  if (!state.supported) return null;
  const activeGroup = state.phase === "audio" ? state.audio : state.essential;
  const progress = activeGroup.total > 0 ? Math.round((activeGroup.completed / activeGroup.total) * 100) : 0;
  const phaseLabel = state.phase === "audio" ? t(language, "offlineAudioPreparing") : t(language, "offlineAppPreparing");
  const failedDetails = state.failedFiles.length > 0 ? `\n${state.failedFiles.slice(0, 4).join("\n")}` : "";
  const title = `${t(language, "offlineAppPreparing")}: ${state.essential.completed}/${state.essential.total} · ${t(language, "offlineAudioPreparing")}: ${state.audio.completed}/${state.audio.total}${failedDetails}`;

  if (state.updateAvailable) {
    return <button type="button" className="offline-pill update" onClick={state.applyUpdate} title={title}>↻ {t(language, "offlineUpdate")}</button>;
  }
  if (state.installing) return <span className="offline-pill installing" title={title}>↓ {phaseLabel} {progress}%</span>;
  if (state.failed > 0) {
    return (
      <button type="button" className="offline-pill retry" onClick={state.retryDownload} title={title}>
        ↻ {t(language, "offlineRetry")} ({state.failed})
      </button>
    );
  }
  if (!state.online && state.appReady) return <span className="offline-pill ready" title={title}>✓ {t(language, "offlineMode")}</span>;
  if (state.ready) return <span className="offline-pill ready" title={title}>✓ {t(language, "offlineReady")}</span>;
  if (state.appReady && !state.audioReady) {
    const audioProgress = state.audio.total > 0 ? Math.round((state.audio.completed / state.audio.total) * 100) : 0;
    return <button type="button" className="offline-pill" onClick={state.retryDownload} title={title}>↓ {t(language, "offlineAudioPreparing")} {audioProgress}%</button>;
  }
  return <button type="button" className="offline-pill" onClick={state.retryDownload} title={title}>○ {t(language, "offlinePreparing")}</button>;
}
