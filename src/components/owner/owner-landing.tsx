import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { GoogleReviewsSection } from "@/components/google-reviews";
import { submitRadarLead } from "@/lib/radar.functions";
import { readTracking, maskPhone, trackRadar } from "@/components/radar/radar-utils";
import { OWNER_OFFER, OWNER_PAGES, type OwnerPage } from "@/lib/owner-pages";

const TYPES = ["Casa em condomínio", "Apartamento", "Casa fora de condomínio", "Terreno", "Imóvel comercial"];
const OCCUPANCY = ["Vazio", "Ocupado pelo proprietário", "Alugado", "Em reforma"];
const PERIODS = ["Manhã", "Tarde", "Noite", "Qualquer horário"];

const field = "w-full border border-ink/20 bg-background px-3 py-2.5 text-sm focus:outline-none focus:border-ink";

function OwnerForm({ page }: { page: OwnerPage }) {
  const [finalidade, setFinalidade] = useState(page.finalidade);
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "ok">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    if (get("website")) return; // honeypot
    if (!f.get("consent")) return setError("É preciso aceitar a Política de Privacidade.");
    setError(null);
    setState("sending");
    const location = get("location");
    const type = get("type");
    const occupancy = get("occupancy");
    const answers =
      page.interest === "sell_property"
        ? { seller_property_type: type, seller_property_location: location, property_occupancy_status: occupancy, finalidade }
        : { landlord_property_type: type, landlord_property_location: location, rental_availability_status: occupancy, finalidade };
    try {
      await submitRadarLead({
        data: {
          ...readTracking(),
          interest_type: page.interest,
          conversion_context: page.context,
          answers,
          lead_name: get("name"),
          lead_phone: phone,
          lead_email: get("email"),
          preferred_contact_channel: "WhatsApp",
          preferred_contact_period: get("period"),
          privacy_consent: true,
        },
      });
      trackRadar("owner_lead_submitted", { interest: page.interest });
      setState("ok");
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "Não foi possível enviar. Tente novamente.");
    }
  }

  if (state === "ok") {
    return (
      <div className="bg-[#0D0D0D] text-white p-8">
        <p className="font-serif text-2xl mb-2">Recebemos seus dados.</p>
        <p className="text-white/70">Um dos nossos corretores vai falar com você pelo WhatsApp no horário escolhido.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-white p-6 md:p-8 ring-1 ring-ink/10 space-y-4" noValidate>
      <p className="font-serif text-2xl">Conte sobre o seu imóvel</p>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="block text-sm">Nome*<input name="name" required minLength={2} maxLength={120} className={field} /></label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm">WhatsApp*<input required inputMode="tel" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(11) 90000-0000" className={field} /></label>
        <label className="block text-sm">E-mail (opcional)<input name="email" type="email" maxLength={255} className={field} /></label>
      </div>
      <label className="block text-sm">Condomínio ou bairro*<input name="location" required maxLength={200} placeholder="Ex.: Alphaville Residencial 3" className={field} /></label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm">Tipo*<select name="type" required className={field} defaultValue=""><option value="" disabled>Selecione</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="block text-sm">Finalidade*<select value={finalidade} onChange={(e) => setFinalidade(e.target.value)} className={field}><option>Venda</option><option>Locação</option><option>Venda e locação</option></select></label>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm">Está ocupado?*<select name="occupancy" required className={field} defaultValue=""><option value="" disabled>Selecione</option>{OCCUPANCY.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="block text-sm">Melhor horário*<select name="period" required className={field} defaultValue=""><option value="" disabled>Selecione</option>{PERIODS.map((t) => <option key={t}>{t}</option>)}</select></label>
      </div>
      <label className="flex gap-2 text-xs text-ink/70"><input type="checkbox" name="consent" className="mt-0.5" />
        <span>Aceito o contato da S.A Imóveis conforme a <Link to="/politica-de-privacidade" className="underline">Política de Privacidade</Link>.</span>
      </label>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <button type="submit" disabled={state === "sending"} className="w-full bg-[#F2DA00] text-[#0D0D0D] font-semibold py-3 hover:brightness-95 disabled:opacity-60">
        {state === "sending" ? "Enviando…" : "Quero uma avaliação"}
      </button>
    </form>
  );
}

export function OwnerLanding({ page }: { page: OwnerPage }) {
  const other = OWNER_PAGES.find((p) => p.path !== page.path)!;
  return (
    <SiteLayout>
      <section className="px-6 pt-14 md:pt-20 pb-16 border-b border-ink/8">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.1fr_1fr] gap-12 items-start">
          <div>
            <nav aria-label="breadcrumb" className="text-xs text-ink/60 mb-6">
              <Link to="/" className="hover:text-ink">Início</Link> / <Link to="/anuncie-seu-imovel" className="hover:text-ink">Anuncie seu imóvel</Link> / {page.label}
            </nav>
            <p className="text-xs tracking-[0.2em] uppercase text-ink/60 mb-4">{page.eyebrow}</p>
            <h1 className="font-serif text-4xl md:text-5xl leading-tight mb-6">{page.h1}</h1>
            <p className="text-lg text-ink/80 leading-relaxed max-w-xl">{page.lead}</p>
            <p className="mt-6 text-sm text-ink/60">
              Prefere {other.finalidade.toLowerCase()}? <Link to={other.path} className="underline underline-offset-4">{other.label}</Link>
            </p>
          </div>
          <div id="formulario"><OwnerForm page={page} /></div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-3xl mb-10">Como funciona</h2>
          <ol className="grid md:grid-cols-4 gap-8">
            {page.steps.map((s, i) => (
              <li key={s.title} className="border-t-2 border-[#0D0D0D] pt-5">
                <span className="font-serif text-3xl text-ink/30">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-serif text-xl mt-2 mb-2">{s.title}</h3>
                <p className="text-ink/75 leading-relaxed text-sm">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-6 py-16 bg-[#0D0D0D] text-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-3xl mb-10">O que a S.A Imóveis oferece</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {OWNER_OFFER.map((o) => (
              <div key={o.title}>
                <Check className="h-5 w-5 text-[#F2DA00] mb-3" />
                <h3 className="font-serif text-xl mb-2">{o.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{o.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GoogleReviewsSection />

      <section className="px-6 py-16 border-t border-ink/8">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-3xl mb-8">Perguntas frequentes</h2>
          <div className="space-y-6">
            {page.faq.map((f) => (
              <div key={f.q} className="border-t border-ink/10 pt-4">
                <h3 className="font-serif text-lg mb-2">{f.q}</h3>
                <p className="text-ink/80 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
          <a href="#formulario" className="mt-10 inline-block bg-[#F2DA00] text-[#0D0D0D] font-semibold px-6 py-3">Quero uma avaliação</a>
        </div>
      </section>
    </SiteLayout>
  );
}
