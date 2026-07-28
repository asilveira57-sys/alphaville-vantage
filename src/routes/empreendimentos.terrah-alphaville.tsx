import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, Building2, MapPin, CalendarClock, Ruler, Car, HardHat, BedDouble } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { EmpreendimentoUnitsBlock } from "@/components/empreendimentos/units-block";
import { TerrahLeadForm } from "@/components/partners/terrah-lead-form";
import { supabase } from "@/integrations/supabase/client";

const SITE = "https://alphaville-vantage.lovable.app";
const URL = `${SITE}/empreendimentos/terrah-alphaville`;
const TITLE = "Terrah Alphaville: plantas de 240 m² a 815 m²";
const DESC =
  "Veja informações do Terrah Alphaville, empreendimento da MPD no Alphagran, com plantas de 240 m², 280 m², 380 m² e cobertura de 815 m².";

/** Imagem principal específica do Terrah Alphaville. Preencher quando houver foto oficial. */
const HERO_IMAGE: string | null = null;
/** Galeria preparada: fachada, implantação, plantas, áreas comuns e andamento da obra. */
const GALLERY: { url: string; alt: string }[] = [];

const SPECS: [string, string][] = [
  ["Construção", "MPD"],
  ["Realização", "MPD"],
  ["Endereço", "Alameda Walker, 139, Lote 4"],
  ["Bairro", "Alphagran Alphaville, Barueri"],
  ["Lançamento", "Setembro de 2024"],
  ["Entrega prevista", "Setembro de 2027"],
  ["Total de unidades", "75"],
  ["Unidades por andar", "3"],
  ["Metragens", "240 m², 280 m², 380 m² e 815 m²"],
  ["Suítes", "3 a 5"],
  ["Vagas", "4 a 7"],
  ["Arquitetura", "LE Arquitetos"],
  ["Decoração", "Quitete e Faria"],
  ["Paisagismo", "Beth Miyazaki"],
];

const TYPOLOGIES = [
  { t: "Apartamento de 240 m²", d: "Planta com 3 suítes, 4 vagas e depósito privativo de 11 m²." },
  { t: "Apartamento de 280 m²", d: "Planta com 4 suítes, 4 vagas e depósito privativo de 11 m²." },
  { t: "Apartamento de 380 m²", d: "Planta com 4 suítes, 5 vagas e depósito privativo de 12 m²." },
  { t: "Cobertura de 815 m²", d: "Unidade de cobertura com 5 suítes, 7 vagas e depósito privativo de 15 m²." },
];

const FAQ = [
  {
    q: "Onde fica o Terrah Alphaville?",
    a: "O empreendimento fica na Alameda Walker, 139, Lote 4, no Alphagran Alphaville, em Barueri.",
  },
  {
    q: "Quais são as metragens disponíveis?",
    a: "As metragens informadas são de 240 m², 280 m² e 380 m², além de uma cobertura de 815 m².",
  },
  {
    q: "Quantas suítes possuem as unidades?",
    a: "As unidades possuem 3, 4 ou 5 suítes, conforme a tipologia.",
  },
  {
    q: "Qual é a previsão de entrega?",
    a: "A previsão de entrega informada é setembro de 2027.",
  },
  {
    q: "Quantas unidades existem por andar?",
    a: "São 3 unidades por andar, em um total de 75 unidades.",
  },
  {
    q: "Como consultar valores e disponibilidade?",
    a: "Valores, unidades e condições comerciais devem ser confirmados com a equipe da S.A. Imóveis.",
  },
];

const RELATED = [
  { slug: "flora-alphaville", name: "Florá Alphaville" },
  { slug: "andromeda-by-mpd", name: "Andrômeda by MPD" },
  { slug: "neo-alphaville", name: "Neo Alphaville" },
];

export const Route = createFileRoute("/empreendimentos/terrah-alphaville")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ApartmentComplex",
          name: "Terrah Alphaville",
          url: URL,
          numberOfAccommodationUnits: 75,
          address: {
            "@type": "PostalAddress",
            streetAddress: "Alameda Walker, 139, Lote 4",
            addressLocality: "Barueri",
            addressRegion: "SP",
            addressCountry: "BR",
          },
          floorSize: [
            { "@type": "QuantitativeValue", value: 240, unitCode: "MTK" },
            { "@type": "QuantitativeValue", value: 280, unitCode: "MTK" },
            { "@type": "QuantitativeValue", value: 380, unitCode: "MTK" },
            { "@type": "QuantitativeValue", value: 815, unitCode: "MTK" },
          ],
          amenityFeature: [
            { "@type": "LocationFeatureSpecification", name: "Suítes", value: "3 a 5" },
            { "@type": "LocationFeatureSpecification", name: "Vagas de garagem", value: "4 a 7" },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: TerrahPage,
});

function TerrahPage() {

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="bg-[#0D0D0D] px-6 py-20 md:py-24 text-white">
        <div className="mx-auto max-w-7xl">
          <Link
            to="/parceiros/mpd"
            className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60 hover:text-[#F2DA00]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Empreendimentos MPD
          </Link>
          <h1 className="font-display mt-6 max-w-[20ch] text-4xl leading-[1.05] md:text-5xl">Terrah Alphaville</h1>
          <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-white/75">
            Apartamentos de 240 m², 280 m² e 380 m², além de cobertura de 815 m², no Alphagran Alphaville.
          </p>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[13px] text-white/80">
            <li className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#F2DA00]" /> Alphagran Alphaville, Barueri</li>
            <li className="inline-flex items-center gap-2"><HardHat className="h-4 w-4 text-[#F2DA00]" /> Em construção</li>
            <li className="inline-flex items-center gap-2"><Ruler className="h-4 w-4 text-[#F2DA00]" /> 240 m² a 815 m²</li>
            <li className="inline-flex items-center gap-2"><BedDouble className="h-4 w-4 text-[#F2DA00]" /> 3 a 5 suítes</li>
            <li className="inline-flex items-center gap-2"><Car className="h-4 w-4 text-[#F2DA00]" /> 4 a 7 vagas</li>
            <li className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[#F2DA00]" /> Entrega prevista: setembro de 2027</li>
          </ul>

          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#contato-terrah"
              className="inline-flex items-center gap-2 bg-[#F2DA00] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0D0D0D] transition hover:brightness-95"
            >
              Consultar unidades disponíveis
            </a>
            <a
              href="#contato-terrah"
              className="inline-flex items-center gap-2 border border-white/25 px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition hover:border-[#F2DA00] hover:text-[#F2DA00]"
            >
              <MessageCircle className="h-4 w-4" /> Falar com um corretor
            </a>
          </div>
        </div>
      </section>

      {/* VISÃO GERAL + FICHA TÉCNICA */}
      <section className="bg-[#EAEAE6] px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            {HERO_IMAGE ? (
              <img
                src={HERO_IMAGE}
                alt="Terrah Alphaville, no Alphagran Alphaville, Barueri"
                loading="lazy"
                decoding="async"
                sizes="(max-width: 768px) 92vw, 55vw"
                className="aspect-[16/10] w-full rounded-[16px] object-cover ring-1 ring-[#0D0D0D]/8"
              />
            ) : (
              <div className="grid aspect-[16/10] w-full place-items-center rounded-[16px] bg-[#0D0D0D]/5 text-center ring-1 ring-[#0D0D0D]/10">
                <div>
                  <Building2 className="mx-auto h-8 w-8 text-[#0D0D0D]/35" />
                  <p className="mt-3 font-display text-xl text-[#171717]">Terrah Alphaville</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#1A1A1A]/45">
                    Imagens oficiais em breve
                  </p>
                </div>
              </div>
            )}

            {GALLERY.length > 0 ? (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {GALLERY.map((g) => (
                  <img
                    key={g.url}
                    src={g.url}
                    alt={g.alt}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/3] w-full rounded-[10px] object-cover ring-1 ring-[#0D0D0D]/8"
                  />
                ))}
              </div>
            ) : null}

            <h2 className="font-display mt-10 text-2xl text-[#171717]">Visão geral</h2>
            <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-[#1A1A1A]/75">
              O Terrah Alphaville é um empreendimento residencial de alto padrão localizado no Alphagran Alphaville, em
              Barueri. O projeto reúne apartamentos amplos, poucas unidades por andar e diferentes tipologias, com
              opções de 240 m², 280 m² e 380 m², além de uma cobertura de 815 m². A previsão de entrega informada é
              setembro de 2027.
            </p>
          </div>

          <div className="h-fit rounded-[16px] bg-white p-6 ring-1 ring-[#0D0D0D]/8">
            <h2 className="font-display text-2xl text-[#171717]">Ficha técnica</h2>
            <dl className="mt-4 divide-y divide-[#0D0D0D]/8 text-[15px]">
              {SPECS.map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-[#1A1A1A]/60">{k}</dt>
                  <dd className="text-right font-medium text-[#171717]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* TIPOLOGIAS */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-2xl text-[#171717] md:text-3xl">Tipologias</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {TYPOLOGIES.map((c) => (
              <article key={c.t} className="rounded-[16px] bg-[#EAEAE6] p-7 ring-1 ring-[#0D0D0D]/8">
                <Ruler className="h-5 w-5 text-[#0D0D0D]/50" />
                <h3 className="font-display mt-4 text-xl text-[#171717]">{c.t}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#1A1A1A]/75">{c.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CONCEITO + LOCALIZAÇÃO */}
      <section className="bg-[#EAEAE6] px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2">
          <div className="rounded-[16px] bg-white p-7 ring-1 ring-[#0D0D0D]/8">
            <h2 className="font-display text-2xl text-[#171717]">Conceito do empreendimento</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#1A1A1A]/75">
              O Terrah foi desenvolvido para um perfil que procura metragem ampla, poucas unidades por andar e
              localização residencial em Alphaville. As diferentes tipologias permitem comparar plantas familiares,
              unidades maiores e cobertura dentro do mesmo empreendimento.
            </p>
          </div>
          <div className="rounded-[16px] bg-white p-7 ring-1 ring-[#0D0D0D]/8">
            <h2 className="font-display text-2xl text-[#171717]">Terrah no Alphagran Alphaville</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#1A1A1A]/75">
              O empreendimento está localizado na Alameda Walker, no Alphagran Alphaville, região residencial de Barueri
              próxima aos principais serviços, escolas, comércio e acessos de Alphaville.
            </p>
          </div>
        </div>
      </section>

      {/* MOMENTO + ANÁLISE */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2">
          <div className="rounded-[16px] bg-[#EAEAE6] p-7 ring-1 ring-[#0D0D0D]/8">
            <h2 className="font-display text-2xl text-[#171717]">Momento do empreendimento</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#1A1A1A]/75">
              O Terrah Alphaville está em construção, com previsão de entrega para setembro de 2027. Valores, unidades e
              condições comerciais devem ser confirmados com a equipe da S.A. Imóveis.
            </p>
          </div>
          <div className="rounded-[16px] bg-[#0D0D0D] p-7 text-white">
            <h2 className="font-display text-2xl">Análise da S.A. Imóveis</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/75">
              Na escolha de uma unidade no Terrah, vale comparar metragem, andar, final, posição solar, vista, número de
              vagas, depósito privativo e forma de pagamento. A equipe da S.A. Imóveis pode ajudar na comparação entre
              as plantas de 240 m², 280 m², 380 m² e a cobertura.
            </p>
          </div>
        </div>
      </section>

      {/* UNIDADES DISPONÍVEIS */}
      <section className="bg-[#EAEAE6] px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-2xl text-[#171717] md:text-3xl">Unidades disponíveis</h2>
          <EmpreendimentoUnitsBlock empreendimentoSlug="terrah-alphaville" contactHref="#contato-terrah" />
        </div>
      </section>

      {/* RELACIONADOS */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-2xl text-[#171717] md:text-3xl">Empreendimentos relacionados</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {RELATED.map((r) => (
              <Link
                key={r.slug}
                to="/empreendimentos/$slug"
                params={{ slug: r.slug }}
                className="rounded-[14px] bg-[#EAEAE6] p-6 ring-1 ring-[#0D0D0D]/8 transition hover:ring-[#0D0D0D]/25"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1A1A1A]/45">MPD</span>
                <p className="font-display mt-2 text-xl text-[#171717]">{r.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#EAEAE6] px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-2xl text-[#171717] md:text-3xl">Perguntas frequentes</h2>
          <div className="mt-8 divide-y divide-[#0D0D0D]/10">
            {FAQ.map((f) => (
              <div key={f.q} className="py-5">
                <h3 className="text-[15px] font-semibold text-[#171717]">{f.q}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#1A1A1A]/70">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section id="contato-terrah" className="scroll-mt-24 bg-[#0D0D0D] px-6 py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-display text-3xl leading-[1.1] md:text-4xl">Consulte unidades do Terrah Alphaville</h2>
            <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-white/70">
              Receba informações atualizadas sobre plantas, disponibilidade, valores e condições de compra.
            </p>
          </div>
          <TerrahLeadForm />
        </div>
      </section>
    </SiteLayout>
  );
}
