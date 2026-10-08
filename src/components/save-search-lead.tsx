import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, Download, MessageCircle, Mail, X } from "lucide-react";
import { saveSearchLead, SEARCH_LEAD_CONSENT } from "@/lib/search-leads.functions";
import { SITE_URL } from "@/lib/site";

export type PdfProperty = {
  id: string;
  slug: string;
  title: string;
  city: string | null;
  neighborhood: string | null;
  bedrooms: number | null;
  area_useful: number | null;
  area_built: number | null;
  area_total: number | null;
  price_sale: number | null;
  price_rent: number | null;
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

async function buildPdf(name: string, query: string, url: string, items: PdfProperty[], total: number) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const header = () => {
    doc.setFillColor(13, 13, 13);
    doc.rect(0, 0, W, 26, "F");
    doc.setTextColor(242, 218, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("S.A IMÓVEIS ALPHAVILLE", 14, 13);
    doc.setTextColor(234, 234, 230);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("PESQUISA INTELIGENTE", 14, 20);
    doc.text("(11) 99551-5053", W - 14, 20, { align: "right" });
  };
  header();
  let y = 38;
  doc.setTextColor(13, 13, 13);
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.text(`Sua seleção, ${name.split(" ")[0]}`, 14, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  const summary = `${total} imóvel(is) encontrado(s)${query ? ` para "${query}"` : ""} · ${new Date().toLocaleDateString("pt-BR")}`;
  doc.text(doc.splitTextToSize(summary, W - 28), 14, y);
  y += 6;
  doc.setTextColor(13, 13, 13);
  doc.textWithLink("Ver a pesquisa completa no site", 14, y, { url });
  y += 8;

  items.forEach((p, i) => {
    if (y > 270) {
      doc.addPage();
      header();
      y = 38;
    }
    doc.setDrawColor(220, 220, 215);
    doc.line(14, y - 4, W - 14, y - 4);
    doc.setFillColor(242, 218, 0);
    doc.rect(14, y - 1, 2, 14, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const title = doc.splitTextToSize(`${i + 1}. ${p.title}`, W - 80);
    doc.text(title[0], 20, y + 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    const area = p.area_useful || p.area_built || p.area_total;
    const facts = [
      [p.neighborhood, p.city].filter(Boolean).join(", "),
      p.bedrooms ? `${p.bedrooms} dorm.` : null,
      area ? `${Math.round(area)} m²` : null,
    ].filter(Boolean).join(" · ");
    doc.text(facts, 20, y + 8);
    const link = `${SITE_URL}/imoveis/${p.slug}`;
    doc.setTextColor(13, 13, 13);
    doc.textWithLink("Ver imóvel", 20, y + 12.5, { url: link });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const prices = [p.price_sale ? `Venda ${brl(p.price_sale)}` : null, p.price_rent ? `Aluguel ${brl(p.price_rent)}` : null].filter(Boolean) as string[];
    prices.forEach((t, k) => doc.text(t, W - 14, y + 3 + k * 5, { align: "right" }));
    doc.setTextColor(13, 13, 13);
    y += 20;
  });
  if (total > items.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`+ ${total - items.length} imóveis na pesquisa completa do site.`, 14, Math.min(y, 285));
  }
  return doc;
}

export function SaveSearchLead({ items, total, query, filters }: { items: PdfProperty[]; total: number; query: string; filters: Record<string, unknown> }) {
  const save = useServerFn(saveSearchLead);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ url: string; name: string } | null>(null);
  const [f, setF] = useState({ name: "", email: "", phone: "", consent: true, empresa: "" });

  const submit = async (channel: "pdf" | "whatsapp" | "email") => {
    setErr(null);
    if (f.name.trim().length < 2) return setErr("Informe seu nome.");
    if (!f.email.trim() && !f.phone.trim()) return setErr("Informe e-mail ou WhatsApp.");
    if (channel === "whatsapp" && !f.phone.trim()) return setErr("Informe seu WhatsApp.");
    if (channel === "email" && !f.email.trim()) return setErr("Informe seu e-mail.");
    setBusy(true);
    const url = window.location.href;
    try {
      // dispara rastreamento de lead
      (window as any).gtag?.("event", "generate_lead", { form: "pesquisa_salva", channel });
      (window as any).fbq?.("track", "Lead", { content_name: "pesquisa_salva" });
      await save({
        data: {
          ...f,
          channel,
          searchQuery: query || undefined,
          searchUrl: url,
          filters,
          resultCount: total,
          propertyIds: items.slice(0, 60).map((p) => p.id),
        },
      });
      const doc = await buildPdf(f.name, query, url, items.slice(0, 30), total);
      doc.save(`pesquisa-sa-imoveis-${new Date().toISOString().slice(0, 10)}.pdf`);
      const text = `Minha pesquisa na S.A Imóveis Alphaville (${total} imóveis): ${url}`;
      if (channel === "whatsapp") {
        const digits = f.phone.replace(/\D/g, "");
        const to = digits.startsWith("55") ? digits : `55${digits}`;
        window.open(`https://wa.me/${to}?text=${encodeURIComponent(text)}`, "_blank");
      } else if (channel === "email") {
        window.location.href = `mailto:${encodeURIComponent(f.email)}?subject=${encodeURIComponent("Minha pesquisa — S.A Imóveis Alphaville")}&body=${encodeURIComponent(text)}`;
      }
      setDone({ url, name: f.name });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível salvar agora.");
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full border border-ink/15 bg-background px-3 py-2.5 text-sm outline-none focus:border-ink";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={total === 0}
        className="inline-flex items-center gap-2 bg-brand-dark text-brand-yellow px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] hover:opacity-90 disabled:opacity-40"
      >
        <Bookmark className="h-4 w-4" /> Salvar pesquisa em PDF
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-dark/70 p-4" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-md bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button aria-label="Fechar" onClick={() => setOpen(false)} className="absolute right-3 top-3 p-1 text-muted-foreground hover:text-ink">
              <X className="h-5 w-5" />
            </button>
            <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-muted-foreground">Pesquisa Inteligente</p>
            {done ? (
              <>
                <h3 className="mt-2 font-serif text-2xl">Pronto, {done.name.split(" ")[0]}!</h3>
                <p className="mt-2 text-sm text-muted-foreground">Seu PDF foi baixado com {Math.min(total, 30)} imóveis. Um consultor pode falar com você para ajudar na escolha.</p>
                <button onClick={() => setOpen(false)} className="mt-5 w-full bg-brand-yellow text-brand-dark py-3 text-xs font-bold uppercase tracking-widest">Voltar aos imóveis</button>
              </>
            ) : (
              <>
                <h3 className="mt-2 font-serif text-2xl leading-tight">Receba esta seleção em PDF</h3>
                <p className="mt-1 text-sm text-muted-foreground">{total} imóveis{query ? ` para “${query}”` : ""}. Deixe seu contato e envie para você mesmo.</p>
                <div className="mt-5 space-y-3">
                  <input className={input} placeholder="Seu nome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={120} />
                  <input className={input} type="email" placeholder="Seu e-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} maxLength={180} />
                  <input className={input} type="tel" placeholder="Seu WhatsApp com DDD" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} maxLength={40} />
                  <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={f.empresa} onChange={(e) => setF({ ...f, empresa: e.target.value })} />
                  <label className="flex gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} />
                    {SEARCH_LEAD_CONSENT}
                  </label>
                </div>
                {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
                <div className="mt-5 grid gap-2">
                  <button disabled={busy} onClick={() => submit("whatsapp")} className="inline-flex items-center justify-center gap-2 bg-brand-yellow text-brand-dark py-3 text-xs font-bold uppercase tracking-widest disabled:opacity-50">
                    <MessageCircle className="h-4 w-4" /> Baixar PDF e enviar no WhatsApp
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button disabled={busy} onClick={() => submit("email")} className="inline-flex items-center justify-center gap-2 border border-ink py-3 text-[11px] font-bold uppercase tracking-widest disabled:opacity-50">
                      <Mail className="h-4 w-4" /> Por e-mail
                    </button>
                    <button disabled={busy} onClick={() => submit("pdf")} className="inline-flex items-center justify-center gap-2 border border-ink py-3 text-[11px] font-bold uppercase tracking-widest disabled:opacity-50">
                      <Download className="h-4 w-4" /> Só o PDF
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
