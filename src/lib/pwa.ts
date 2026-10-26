// Único ponto de registro do service worker (app instalável).
// Só registra no domínio oficial; em preview/editor/iframe/dev remove registros antigos.
import { SITE_HOST } from "@/lib/site";

export const APP_FLAG_KEY = "sa_app";

function track(event: string, params: Record<string, unknown> = {}) {
  try {
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    w.gtag?.("event", event, params);
  } catch {
    /* ignore */
  }
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** true quando a visita veio do app instalado (?origem=app ou modo standalone). */
export function isAppSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(APP_FLAG_KEY) === "1" || isStandalone();
  } catch {
    return isStandalone();
  }
}

function canRegister(): boolean {
  if (!import.meta.env.PROD) return false;
  try {
    if (window.self !== window.top) return false;
  } catch {
    return false;
  }
  if (new URLSearchParams(location.search).get("sw") === "off") return false;
  return location.hostname.toLowerCase() === SITE_HOST;
}

async function unregisterAppSW() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => (r.active || r.installing || r.waiting)?.scriptURL.endsWith("/sw.js"))
      .map((r) => r.unregister()),
  );
}

let started = false;

export function initPwa(onUpdate: (apply: () => void) => void) {
  if (started || typeof window === "undefined") return;
  started = true;

  // Medição de uso pelo app
  const params = new URLSearchParams(location.search);
  if (params.get("origem") === "app" || isStandalone()) {
    try {
      sessionStorage.setItem(APP_FLAG_KEY, "1");
    } catch {
      /* ignore */
    }
    track("acesso_pelo_app", { page_path: location.pathname });
  }
  window.addEventListener("appinstalled", () => track("app_instalado"));

  if (!("serviceWorker" in navigator)) return;
  if (!canRegister()) {
    void unregisterAppSW();
    return;
  }

  void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((reg) => {
    const notify = (w: ServiceWorker) =>
      onUpdate(() => {
        w.postMessage({ type: "SKIP_WAITING" });
      });
    if (reg.waiting && navigator.serviceWorker.controller) notify(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      nw?.addEventListener("statechange", () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) notify(nw);
      });
    });
    setInterval(() => void reg.update(), 60 * 60 * 1000);
  });

  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
}
