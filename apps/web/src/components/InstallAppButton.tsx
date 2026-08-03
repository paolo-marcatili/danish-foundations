import { useEffect, useMemo, useState } from "react";
import { t } from "../i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallAppButton({ language }: { language: string }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [installed, setInstalled] = useState(() => isStandalone());
  const isIos = useMemo(() => /iphone|ipad|ipod/i.test(navigator.userAgent), []);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setGuideOpen(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function install() {
    if (!promptEvent) {
      setGuideOpen(true);
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  }

  return (
    <>
      <button type="button" className="icon-button install-app-button" onClick={install} aria-label={t(language, "installApp")} title={t(language, "installApp")}>
        ⤓
      </button>
      {guideOpen ? (
        <div className="install-guide-overlay" role="dialog" aria-modal="true" aria-label={t(language, "installAppTitle")}>
          <section className="install-guide-window">
            <button type="button" className="story-reader-close" onClick={() => setGuideOpen(false)} aria-label={t(language, "close")}>×</button>
            <div className="install-guide-icon">📲</div>
            <h2>{t(language, "installAppTitle")}</h2>
            {isIos ? (
              <ol className="install-guide-steps">
                <li>{t(language, "installIosStep1")}</li>
                <li>{t(language, "installIosStep2")}</li>
                <li>{t(language, "installIosStep3")}</li>
                <li>{t(language, "installIosStep4")}</li>
              </ol>
            ) : (
              <p>{t(language, "installGenericBody")}</p>
            )}
            <button type="button" className="primary-button full-width" onClick={() => setGuideOpen(false)}>{t(language, "close")}</button>
          </section>
        </div>
      ) : null}
    </>
  );
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}
