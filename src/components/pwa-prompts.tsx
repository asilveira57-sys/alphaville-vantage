import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { initPwa, isStandalone } from "@/lib/pwa";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const VISITS_KEY = "sa_pwa_visits";
const DISMISS_KEY = "sa_pwa_dismissed_at";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
const PRIVATE = /^\/(admin|cms|auth|audit|reset-password|area-do-parceiro)/;

let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();

/** Hook para o botão "Instalar app" do menu (Android/Chrome). */
export function useInstallPrompt() {
  const [can, setCan] = useState(false);
  useEffect(() => {
    const up = () => setCan(!!deferred && !isStandalone());
    up();
    listeners.add(up);
    return () => void listeners.delete(up);
  }, []);
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    deferred = null;
    listeners.forEach((l) => l());
  };
  return { canInstall: can, install };
}

function recentlyDismissed() {
  const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return Date.now() - t < THIRTY_DAYS;
}

export function PwaPrompts() {
  const [update, setUpdate] = useState<null | (() => void)>(null);
  const [banner, setBanner] = useState<null | "android" | "ios">(null);
  const { install } = useInstallPrompt();

  useEffect(() => {
    initPwa((apply) => setUpdate(() => apply));

    const onBIP = (e: Event) => {
      e.preventDefault();
      deferred = e as BIPEvent;
      listeners.forEach((l) => l());
      if (eligible()) setBanner("android");
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    let visits = 0;
    try {
      if (!sessionStorage.getItem("sa_pwa_counted")) {
        visits = Number(localStorage.getItem(VISITS_KEY) || 0) + 1;
        localStorage.setItem(VISITS_KEY, String(visits));
        sessionStorage.setItem("sa_pwa_counted", "1");
      } else visits = Number(localStorage.getItem(VISITS_KEY) || 0);
    } catch {
      /* ignore */
    }
    function eligible() {
      try {
        return visits >= 2 && !isStandalone() && !recentlyDismissed() && !PRIVATE.test(location.pathname);
      } catch {
        return false;
      }
    }
    const ua = navigator.userAgent;
    const iosSafari = /iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|GSA/.test(ua);
    if (iosSafari && eligible()) setBanner("ios");

    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setBanner(null);
  };

  return (
    <>
      {update && (
        <div role="status" className="fixed left-1/2 top-3 z-[60] -translate-x-1/2 flex items-center gap-3 bg-ink text-canvas px-4 py-2.5 text-xs shadow-lg">
          Nova versão disponível
          <button type="button" onClick={() => update()} className="bg-[#F2DA00] text-ink px-3 py-1 uppercase tracking-widest font-semibold">
            Atualizar
          </button>
          <button type="button" aria-label="Fechar" onClick={() => setUpdate(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {banner && (
        <div className="fixed inset-x-3 bottom-24 z-[55] md:left-auto md:right-6 md:w-80 bg-ink text-canvas p-4 shadow-2xl border border-white/10">
          <button type="button" aria-label="Fechar" onClick={dismiss} className="absolute right-2 top-2 p-1 text-canvas/70">
            <X className="h-4 w-4" />
          </button>
          <p className="font-serif text-lg pr-6">Instale o app S.A Imóveis</p>
          {banner === "android" ? (
            <>
              <p className="mt-1 text-xs text-canvas/70">Acesso rápido à busca, ao Radar e às oportunidades.</p>
              <button
                type="button"
                onClick={async () => {
                  await install();
                  setBanner(null);
                }}
                className="mt-3 bg-[#F2DA00] text-ink px-4 py-2 text-xs uppercase tracking-widest font-semibold"
              >
                Instalar app
              </button>
            </>
          ) : (
            <p className="mt-1 text-xs text-canvas/80">
              Toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.
            </p>
          )}
        </div>
      )}
    </>
  );
}
