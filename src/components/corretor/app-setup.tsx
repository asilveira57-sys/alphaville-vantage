import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellOff, Download } from "lucide-react";
import { getPushPublicKey, removePushSubscription, savePushSubscription, sendTestPush } from "@/lib/corretor.functions";

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

function b64uToBytes(s: string) {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Cartões de "Instalar o app" e "Avisos de lead novo" (início do app). */
export function AppSetup() {
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null);
  const [standalone, setStandalone] = useState(true);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const keyFn = useServerFn(getPushPublicKey);
  const saveFn = useServerFn(savePushSubscription);
  const removeFn = useServerFn(removePushSubscription);
  const testFn = useServerFn(sendTestPush);

  useEffect(() => {
    setStandalone(isStandalone());
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) setPerm("unsupported");
    else {
      setPerm(Notification.permission);
      void navigator.serviceWorker.getRegistration("/").then(async (reg) => {
        const sub = await reg?.pushManager.getSubscription();
        setSubscribed(!!sub);
      });
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    await installEvt.userChoice;
    setInstallEvt(null);
  };

  const enable = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const p = await Notification.requestPermission();
      setPerm(p);
      if (p !== "granted") {
        setMsg("Os avisos foram bloqueados. Libere nas configurações do celular (Notificações do app/navegador).");
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.ready);
      if (!reg) throw new Error("O app ainda está carregando. Feche e abra de novo.");
      const { publicKey } = await keyFn();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(publicKey) }));
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await saveFn({ data: { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, userAgent: navigator.userAgent.slice(0, 300) } });
      setSubscribed(true);
      const r = await testFn();
      setMsg(r.sent > 0 ? "Pronto! Mandei um aviso de teste." : "Avisos ligados.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removeFn({ data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMsg("Avisos desligados neste celular.");
    } finally {
      setBusy(false);
    }
  };

  const card = "border border-ink/10 bg-white/60 p-4";

  return (
    <div className="space-y-3">
      {!standalone && (
        <div className={card}>
          <div className="flex items-start gap-3">
            <Download className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-ink">Instale o app no celular</p>
              {installEvt ? (
                <button type="button" onClick={install} className="mt-3 bg-ink text-canvas px-4 py-2.5 text-[11px] uppercase tracking-widest font-semibold">
                  Instalar S.A Corretor
                </button>
              ) : isIos() ? (
                <p className="text-muted-foreground mt-1">
                  No Safari, toque em <b>Compartilhar</b> (quadrado com seta) → <b>Adicionar à Tela de Início</b>.
                </p>
              ) : (
                <p className="text-muted-foreground mt-1">
                  No Chrome, toque nos <b>⋮</b> → <b>Instalar app</b> (ou "Adicionar à tela inicial").
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={card}>
        <div className="flex items-start gap-3">
          {subscribed ? <Bell className="h-5 w-5 mt-0.5 shrink-0 text-emerald-700" /> : <BellOff className="h-5 w-5 mt-0.5 shrink-0" />}
          <div className="flex-1 text-sm">
            <p className="font-medium text-ink">{subscribed ? "Avisos de lead novo ligados" : "Avisos de lead novo"}</p>
            {perm === "unsupported" ? (
              <p className="text-muted-foreground mt-1">
                {isIos() && !standalone
                  ? "No iPhone, primeiro instale o app na tela de início e abra por ele."
                  : "Este navegador não recebe avisos. Use o Chrome (Android) ou o app instalado (iPhone)."}
              </p>
            ) : subscribed ? (
              <button type="button" disabled={busy} onClick={disable} className="mt-2 text-[11px] uppercase tracking-widest text-muted-foreground underline">
                Desligar neste celular
              </button>
            ) : (
              <>
                <p className="text-muted-foreground mt-1">Receba no celular quando chegar um lead pelo portal.</p>
                <button type="button" disabled={busy} onClick={enable} className="mt-3 bg-[#F2DA00] text-[#0D0D0D] px-4 py-2.5 text-[11px] uppercase tracking-widest font-semibold disabled:opacity-50">
                  {busy ? "Ligando…" : "Ligar avisos"}
                </button>
              </>
            )}
            {msg && <p className="text-xs mt-2 text-muted-foreground">{msg}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
