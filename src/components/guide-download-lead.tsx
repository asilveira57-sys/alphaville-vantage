import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileText, X } from "lucide-react";
import { submitGuideLead, GUIDE_LEAD_CONSENT } from "@/lib/guide-leads.functions";

/** Bloco "Baixe a ficha": nome + e-mail + WhatsApp viram lead; o PDF é gerado no navegador. */
export function GuideDownloadLead({ kind, slug, title, heading, text, buildPdf, fileName, modalTitle }: {
  modalTitle?: string;
  kind: "rua" | "bairro" | "condominio";
  slug: string;
  title: string;
  heading: string;
  text: string;
  fileName: string;
  buildPdf: (firstName: string) => Promise<{ save: (n: string) => void }>;
}) {
  const send = useServerFn(submitGuideLead);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [f, setF] = useState({ name: "", email: "", phone: "", consent: true, empresa: "" });

  const submit = async () => {
    setErr(null);
    if (f.name.trim().length < 2) return setErr("Informe seu nome.");
    if (!f.email.trim()) return setErr("Informe seu e-mail.");
    if (f.phone.replace(/\D/g, "").length < 10) return setErr("Informe seu WhatsApp com DDD.");
    setBusy(true);
    try {
      (window as any).gtag?.("event", "generate_lead", { form: `ficha_${kind}`, item: slug });
      (window as any).fbq?.("track", "Lead", { content_name: `ficha_${kind}` });
      await send({ data: { kind, slug, title, ...f, landing_page: window.location.pathname } });
      const first = f.name.trim().split(" ")[0];
      const doc = await buildPdf(first);
      doc.save(fileName);
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível agora. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full border border-ink/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-ink";
  return (
    <section className="border border-ink/10 bg-brand-dark text-white p-6 md:p-10 flex flex-col md:flex-row md:items-center gap-6 justify-between">
      <div className="flex gap-4 max-w-2xl">
        <FileText className="h-10 w-10 shrink-0 text-brand-yellow" aria-hidden />
        <div>
          <h2 className="font-serif text-2xl md:text-3xl">{heading}</h2>
          <p className="mt-2 text-sm text-white/75 leading-relaxed">{text}</p>
        </div>
      </div>
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 bg-brand-yellow text-brand-dark px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] hover:opacity-90 shrink-0">
        <Download className="h-4 w-4" /> Baixar a ficha em PDF
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-dark/70 p-4 text-ink" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-md bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button aria-label="Fechar" onClick={() => setOpen(false)} className="absolute right-3 top-3 p-1 text-muted-foreground hover:text-ink">
              <X className="h-5 w-5" />
            </button>
            <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-muted-foreground">S.A Imóveis Alphaville</p>
            {done ? (
              <>
                <h3 className="mt-2 font-serif text-2xl">Pronto, {f.name.trim().split(" ")[0]}!</h3>
                <p className="mt-2 text-sm text-muted-foreground">A ficha foi baixada com os números de hoje. Um consultor da S.A pode falar com você pelo WhatsApp.</p>
                <button onClick={() => setOpen(false)} className="mt-5 w-full bg-brand-yellow text-brand-dark py-3 text-xs font-bold uppercase tracking-widest">Voltar à página</button>
              </>
            ) : (
              <>
                <h3 className="mt-2 font-serif text-2xl leading-tight">{modalTitle ?? `Receba a ficha da ${title}`}</h3>
                <p className="mt-1 text-sm text-muted-foreground">PDF com imóveis, preços, condomínios e o que tem perto, atualizado hoje.</p>
                <div className="mt-5 space-y-3">
                  <input className={input} placeholder="Seu nome" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={120} />
                  <input className={input} type="email" autoComplete="email" placeholder="Seu e-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} maxLength={180} />
                  <input className={input} type="tel" autoComplete="tel" placeholder="Seu WhatsApp com DDD" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} maxLength={40} />
                  <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={f.empresa} onChange={(e) => setF({ ...f, empresa: e.target.value })} />
                  <label className="flex gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} />
                    {GUIDE_LEAD_CONSENT}
                  </label>
                </div>
                {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
                <button disabled={busy} onClick={submit}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-brand-yellow text-brand-dark py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-50">
                  <Download className="h-4 w-4" /> {busy ? "Gerando…" : "Baixar ficha"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
