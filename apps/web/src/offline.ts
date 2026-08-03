import { useEffect, useState } from "react";
import { publicUrl } from "./publicUrl";

export interface OfflineState {
  supported: boolean;
  ready: boolean;
  online: boolean;
  installing: boolean;
  completed: number;
  total: number;
  updateAvailable: boolean;
  applyUpdate: () => void;
}

export function useOfflineState(): OfflineState {
  const [state, setState] = useState<Omit<OfflineState, "applyUpdate">>({
    supported: import.meta.env.PROD && typeof navigator !== "undefined" && "serviceWorker" in navigator,
    ready: false,
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    installing: false,
    completed: 0,
    total: 0,
    updateAvailable: false
  });
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let disposed = false;
    const onOnline = () => setState((previous) => ({ ...previous, online: navigator.onLine }));
    const onMessage = (event: MessageEvent) => {
      const message = event.data ?? {};
      if (message.type === "OFFLINE_PROGRESS") {
        setState((previous) => ({ ...previous, installing: true, completed: Number(message.completed) || 0, total: Number(message.total) || 0 }));
      } else if (message.type === "OFFLINE_INSTALLED" || message.type === "OFFLINE_READY") {
        setState((previous) => ({ ...previous, ready: true, installing: false, completed: previous.total || Number(message.total) || 0 }));
      }
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOnline);
    navigator.serviceWorker.addEventListener("message", onMessage);

    void navigator.serviceWorker.register(publicUrl("sw.js"), { scope: import.meta.env.BASE_URL }).then((registration) => {
      if (disposed) return;
      if (registration.waiting) {
        setWaiting(registration.waiting);
        setState((previous) => ({ ...previous, updateAvailable: true }));
      }
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        setState((previous) => ({ ...previous, installing: !navigator.serviceWorker.controller }));
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(worker);
            setState((previous) => ({ ...previous, installing: false, updateAvailable: true }));
          }
        });
      });
      if (navigator.serviceWorker.controller) {
        setState((previous) => ({ ...previous, ready: true }));
        navigator.serviceWorker.controller.postMessage({ type: "GET_OFFLINE_STATUS" });
      }
      if (navigator.onLine) void registration.update();
      void navigator.storage?.persist?.();
    }).catch(() => setState((previous) => ({ ...previous, supported: false, installing: false })));

    const onControllerChange = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => {
      disposed = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOnline);
      navigator.serviceWorker.removeEventListener("message", onMessage);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return {
    ...state,
    applyUpdate: () => waiting?.postMessage({ type: "SKIP_WAITING" })
  };
}
