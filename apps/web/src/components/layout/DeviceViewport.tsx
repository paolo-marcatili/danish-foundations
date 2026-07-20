import { useEffect, type CSSProperties, type ReactNode } from "react";
import type { AppSettings, ViewportPreset } from "../../storage";
import { t } from "../../i18n";

interface DeviceViewportProps {
  settings: AppSettings;
  language: string;
  children: ReactNode;
  onExitSimulation: () => void;
  onToggleDeviceFrame: () => void;
}

interface DevicePreset {
  width: number;
  height: number;
  forceLayout: "mobile" | "desktop";
}

export const DEVICE_PRESETS: Partial<Record<ViewportPreset, DevicePreset>> = {
  iphone_portrait: { width: 390, height: 844, forceLayout: "mobile" },
  android_portrait: { width: 360, height: 800, forceLayout: "mobile" },
  small_phone: { width: 320, height: 568, forceLayout: "mobile" },
  tablet_portrait: { width: 768, height: 1024, forceLayout: "mobile" },
  phone_landscape: { width: 844, height: 390, forceLayout: "mobile" }
};

export function DeviceViewport({
  settings,
  language,
  children,
  onExitSimulation,
  onToggleDeviceFrame
}: DeviceViewportProps) {
  const preset = DEVICE_PRESETS[settings.viewportPreset];
  const simulationActive = Boolean(preset) || settings.viewportPreset === "desktop_split";
  const forceLayout = settings.viewportPreset === "desktop_split"
    ? "desktop"
    : preset?.forceLayout ?? "auto";
  const style = preset
    ? ({ "--device-width": `${preset.width}px`, "--device-height": `${preset.height}px` } as CSSProperties)
    : undefined;

  useEffect(() => {
    if (!simulationActive) return undefined;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onExitSimulation();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [simulationActive, onExitSimulation]);

  return (
    <div className={`device-preview-root ${simulationActive ? "active" : "inactive"}`}>
      {simulationActive ? (
        <div className="device-preview-toolbar" role="region" aria-label={t(language, "deviceSimulationToolbar")}>
          <strong>{t(language, "deviceSimulationActive")}</strong>
          <span>{t(language, viewportLabelKey(settings.viewportPreset))}</span>
          <button type="button" className="ghost-button compact-button" onClick={onToggleDeviceFrame}>
            {settings.showDeviceFrame ? t(language, "hideDeviceFrame") : t(language, "showDeviceFrame")}
          </button>
          <button type="button" className="primary-button compact-button" onClick={onExitSimulation}>
            {t(language, "exitDeviceSimulation")}
          </button>
          <kbd>Esc</kbd>
        </div>
      ) : null}
      <div
        className={`device-viewport-shell ${preset ? "simulated" : "native"} ${settings.showDeviceFrame ? "with-frame" : ""}`}
        data-viewport-preset={settings.viewportPreset}
        data-force-layout={forceLayout}
        style={style}
      >
        <div className="device-viewport-canvas">{children}</div>
      </div>
    </div>
  );
}

function viewportLabelKey(preset: ViewportPreset): string {
  if (preset === "desktop_split") return "viewportDesktopSplit";
  if (preset === "iphone_portrait") return "viewportIphonePortrait";
  if (preset === "android_portrait") return "viewportAndroidPortrait";
  if (preset === "small_phone") return "viewportSmallPhone";
  if (preset === "tablet_portrait") return "viewportTabletPortrait";
  if (preset === "phone_landscape") return "viewportPhoneLandscape";
  return "viewportAuto";
}
