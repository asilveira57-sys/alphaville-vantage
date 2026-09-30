import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Ruler,
} from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { EditorialContent } from "@/components/editorial-content";
import { EmpreendimentoCoverImage } from "@/components/empreendimentos/cover-image";
import { EmpreendimentoGalleryBlock } from "@/components/empreendimentos/gallery-block";
import { EmpreendimentoPlansBlock } from "@/components/empreendimentos/plans-block";
import { EmpreendimentoUnitsBlock } from "@/components/empreendimentos/units-block";
import { PartnerLeadForm } from "@/components/partners/partner-lead-form";
import type { DevelopmentPartner } from "@/lib/development-partners.functions";

type FaqItem = { question?: string | null; answer?: string | null };

type EditorialDevelopment = {
  title: string;
  slug: string;
  excerpt?: string | null;
  html_content: string;
  featured_image?: string | null;
  hero_eyebrow?: string | null;
  cidade?: string | null;
  regiao?: string | null;
  bairro?: string | null;
  condominio?: string | null;
  categoria_editorial?: string | null;
  tags?: string[] | null;
  faq?: FaqItem[] | null;
  cta_title?: string | null;
  cta_text?: string | null;
};

function compact(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).filter(Boolean) as string[];
}

export function EditorialDevelopmentPage({
  page,
  partner,
}: {
  page: EditorialDevelopment;
  partner: DevelopmentPartner | null;
}) {
  const location = compact([page.bairro, page.regiao, page.cidade]).join(", ") || "Alphaville e região";
  const status = page.hero_eyebrow || page.categoria_editorial || "Empreendimento";
  const highlights = (page.tags ?? []).filter(Boolean).slice(0, 5);
  const faq = (page.faq ?? []).filter((item) => item.question?.trim() && item.answer?.trim());
  const partnerName = partner?.name || "S.A. Imóveis";
  const partnerSlug = partner?.slug || "sa-imoveis";
  const contactId = `contato-${page.slug}`;
  const partnerHref = partner ? `/parceiros/${partner.slug}` : "/contato";

  return (
    <SiteLayout>
      <section className="bg-brand-dark px-6 py-16 text-primary-foreground md:py-24">
        <div className="mx-auto max-w-7xl">
          <Link
            to={partner ? "/parceiros/$slug" : "/"}
            params={partner ? { slug: partner.slug } : undefined}
            className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/60 transition hover:text-accent"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {partner ? `Empreendimentos ${partner.name}` : "S.A. Imóveis"}
          </Link>
          <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.25em] text-accent">{status}</p>
          <h1 className="mt-4 max-w-[20ch] font-display text-4xl leading-[1.05] md:text-5xl">{page.title}</h1>
          {page.excerpt ? (
            <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-primary-foreground/75">{page.excerpt}</p>
          ) : null}
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[13px] text-primary-foreground/80">
            <li className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" /> {location}</li>
            <li className="inline-flex items-center gap-2"><Building2 className="h-4 w-4 text-accent" /> {partnerName}</li>
            {highlights.slice(0, 2).map((highlight, index) => (
              <li key={highlight} className="inline-flex items-center gap-2">
                {index === 0 ? <Ruler className="h-4 w-4 text-accent" /> : <CalendarClock className="h-4 w-4 text-accent" />}
                {highlight}
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href={`#${contactId}`} className="inline-flex items-center gap-2 bg-accent px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-accent-foreground transition hover:brightness-95">
              Consultar unidades disponíveis
            </a>
            <a href={`#${contactId}`} className="inline-flex items-center gap-2 border border-primary-foreground/25 px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground transition hover:border-accent hover:text-accent">
              <MessageCircle className="h-4 w-4" /> Falar com um corretor
            </a>
          </div>
        </div>
      </section>

      <section className="bg-canvas px-6 py-12 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <EmpreendimentoCoverImage
              empreendimentoSlug={page.slug}
              alt={`${page.title} — ${location}`}
              fallback={page.featured_image ? (
                <img src={page.featured_image} alt={`${page.title} — ${location}`} decoding="async" sizes="(max-width: 768px) 92vw, 55vw" className="aspect-[16/10] w-full rounded-[16px] object-cover ring-1 ring-ink/10" />
              ) : (
                <div className="grid aspect-[16/10] w-full place-items-center rounded-[16px] bg-ink/5 text-center ring-1 ring-ink/10">
                  <div><Building2 className="mx-auto h-8 w-8 text-ink/35" /><p className="mt-3 font-display text-xl text-ink">{page.title}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-ink/45">Imagens oficiais em breve</p></div>
                </div>
              )}
            />
            {page.html_content ? (
              <div className="mt-10"><h2 className="font-display text-2xl text-ink">Visão geral</h2><EditorialContent html={page.html_content} className="mt-4" /></div>
            ) : null}
          </div>

          <aside className="h-fit rounded-[16px] bg-card p-6 text-card-foreground ring-1 ring-ink/10">
            <h2 className="font-display text-2xl">Ficha técnica</h2>
            <dl className="mt-4 divide-y divide-ink/10 text-[15px]">
              {compact([partner ? `Incorporadora|${partner.name}` : null, `Localização|${location}`, `Status|${status}`, ...highlights.map((item, index) => `${index === 0 ? "Destaque" : `Informação ${index + 1}`}|${item}`)]).map((entry) => {
                const [key, value] = entry.split("|");
                return <div key={entry} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3"><dt className="min-w-0 text-muted-foreground">{key}</dt><dd className="max-w-[18rem] text-right font-medium">{value}</dd></div>;
              })}
            </dl>
            <a href={`#${contactId}`} className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-primary px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground transition hover:bg-primary/90">Consultar disponibilidade</a>
          </aside>
        </div>
      </section>

      {highlights.length > 2 ? (
        <section className="bg-card px-6 py-12 md:py-16">
          <div className="mx-auto max-w-7xl"><h2 className="font-display text-2xl text-card-foreground md:text-3xl">Destaques do empreendimento</h2><ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{highlights.map((item) => <li key={item} className="flex items-start gap-3 rounded-[8px] bg-canvas p-5 text-sm leading-relaxed text-ink ring-1 ring-ink/10"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{item}</li>)}</ul></div>
        </section>
      ) : null}

      <EmpreendimentoGalleryBlock empreendimentoSlug={page.slug} name={page.title} />
      <EmpreendimentoPlansBlock empreendimentoSlug={page.slug} name={page.title} />

      <section className="bg-card px-6 py-12 md:py-16">
        <div className="mx-auto max-w-7xl"><h2 className="font-display text-2xl text-card-foreground md:text-3xl">Unidades disponíveis</h2><EmpreendimentoUnitsBlock empreendimentoSlug={page.slug} contactHref={`#${contactId}`} /></div>
      </section>

      {faq.length > 0 ? (
        <section className="bg-canvas px-6 py-12 md:py-16"><div className="mx-auto max-w-3xl"><h2 className="font-display text-2xl text-ink md:text-3xl">Perguntas frequentes</h2><div className="mt-8 divide-y divide-ink/10">{faq.map((item) => <div key={item.question} className="py-5"><h3 className="text-[15px] font-semibold text-ink">{item.question}</h3><p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{item.answer}</p></div>)}</div></div></section>
      ) : null}

      <section id={contactId} className="scroll-mt-24 bg-brand-dark px-6 py-16 text-primary-foreground md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.9fr_1.1fr]">
          <div><h2 className="font-display text-3xl leading-[1.1] md:text-4xl">{page.cta_title || `Consulte unidades do ${page.title}`}</h2><p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-primary-foreground/70">{page.cta_text || "Receba informações atualizadas sobre disponibilidade, valores e condições de compra."}</p>{partner ? <Link to="/parceiros/$slug" params={{ slug: partner.slug }} className="mt-6 inline-flex text-[10px] font-semibold uppercase tracking-[0.2em] text-accent hover:underline">Conhecer {partner.name}</Link> : <Link to="/contato" className="mt-6 inline-flex text-[10px] font-semibold uppercase tracking-[0.2em] text-accent hover:underline">Conhecer a S.A. Imóveis</Link>}</div>
          <PartnerLeadForm partnerSlug={partnerSlug} partnerName={partnerName} empreendimentos={[{ slug: page.slug, title: page.title }]} leadSource="empreendimento_page" />
        </div>
      </section>
    </SiteLayout>
  );
}