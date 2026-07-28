import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle, Building2, MapPin, CalendarClock, Ruler, Car, HardHat } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { EmpreendimentoUnitsBlock } from "@/components/empreendimentos/units-block";
import { AndromedaLeadForm } from "@/components/partners/andromeda-lead-form";

const SITE = "https://alphaville-vantage.lovable.app";
const URL = `${SITE}/empreendimentos/andromeda-by-mpd`;
const TITLE = "Andrômeda by MPD em Alphaville: plantas e unidades";
const DESC =
  "Veja informações do Andrômeda by MPD em Alphaville, com plantas de 90 m² e 123 m², entrega prevista para outubro de 2028 e atendimento da S.A. Imóveis.";

/** Imagem principal específica do empreendimento. Preencher quando houver foto oficial. */
const HERO_IMAGE: string | null = null;
/** Galeria preparada para imagens reais do Andrômeda by MPD. */
const GALLERY: { url: string; alt: string }[] = [];

const FAQ = [
  {
    q: "Onde fica o Andrômeda by MPD?",
    a: "O empreendimento fica em Alphaville, Barueri.",
  },
  {
    q: "Quais são as metragens do Andrômeda?",
    a: "As plantas informadas são de 90 m² e 123 m².",
  },
  {
    q: "Qual é a previsão de entrega?",
    a: "A previsão de entrega informada é outubro de 2028.",
  },
  {
    q: "Quantas vagas possuem as unidades?",
    a: "As unidades contam com 2 vagas.",
  },
  {
    q: "Como consultar valores e unidades disponíveis?",
    a: "Valores, condições de pagamento e unidades disponíveis devem ser confirmados com a equipe da S.A. Imóveis.",
  },
];

const RELATED = [
  { slug: "terrah-alphaville", name: "Terrah Alphaville" },
  { slug: "flora-alphaville", name: "Florá Alphaville" },
  { slug: "neo-alphaville", name: "Neo Alphaville" },
];

export const Route = createFileRoute("/empreendimentos/andromeda-by-mpd")({
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
          name: "Andrômeda by MPD",
          url: URL,
          numberOfAvailableAccommodationUnits: undefined,
          address: {
            "@type": "PostalAddress",
            addressLocality: "Barueri",
            addressRegion: "SP",
            addressCountry: "BR",
            streetAddress: "Alphaville",
          },
          floorSize: [
            { "@type": "QuantitativeValue", value: 90, unitCode: "MTK" },
            { "@type": "QuantitativeValue", value: 123, unitCode: "MTK" },
          ],
          amenityFeature: {
            "@type": "LocationFeatureSpecification",
            name: "Vagas de garagem",
            value: 2,
          },
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
  component: AndromedaPage,
});

function AndromedaPage() {

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
          <h1 className="font-display mt-6 max-w-[20ch] text-4xl leading-[1.05] md:text-5xl">
            Andrômeda by MPD em Alphaville
          </h1>
          <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-white/75">
            Apartamentos de 90 m² e 123 m² com entrega prevista para outubro de 2028.
          </p>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[13px] text-white/80">
            <li className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#F2DA00]" /> Alphaville, Barueri</li>
            <li className="inline-flex items-center gap-2"><HardHat className="h-4 w-4 text-[#F2DA00]" /> Em construção</li>
            <li className="inline-flex items-center gap-2"><Ruler className="h-4 w-4 text-[#F2DA00]" /> 90 m² e 123 m²</li>
            <li className="inline-flex items-center gap-2"><Car className="h-4 w-4 text-[#F2DA00]" /> 2 vagas</li>
            <li className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[#F2DA00]" /> Entrega prevista: outubro de 2028</li>
          </ul>

          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#contato-andromeda"
              className="inline-flex items-center gap-2 bg-[#F2DA00] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0D0D0D] transition hover:brightness-95"
            >
              Consultar unidades disponíveis
            </a>
            <a
              href="#contato-andromeda"
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
                alt="Andrômeda by MPD em Alphaville, Barueri"
                loading="lazy"
                decoding="async"
                sizes="(max-width: 768px) 92vw, 55vw"
                className="aspect-[16/10] w-full rounded-[16px] object-cover ring-1 ring-[#0D0D0D]/8"
              />
            ) : (
              <div className="grid aspect-[16/10] w-full place-items-center rounded-[16px] bg-[#0D0D0D]/5 text-center ring-1 ring-[#0D0D0D]/10">
                <div>
                  <Building2 className="mx-auto h-8 w-8 text-[#0D0D0D]/35" />
                  <p className="mt-3 font-display text-xl text-[#171717]">Andrômeda by MPD</p>
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
              O Andrômeda by MPD é um empreendimento residencial em Alphaville com opções de 90 m² e 123 m². O projeto
              atende perfis que procuram plantas funcionais, duas vagas e a possibilidade de aquisição durante o período
              de construção. A previsão de entrega informada é outubro de 2028.
            </p>
          </div>

          <div className="h-fit rounded-[16px] bg-white p-6 ring-1 ring-[#0D0D0D]/8">
            <h2 className="font-display text-2xl text-[#171717]">Ficha técnica</h2>
            <dl className="mt-4 divide-y divide-[#0D0D0D]/8 text-[15px]">
              {[
                ["Construtora", "MPD"],
                ["Região", "Alphaville, Barueri"],
                ["Status", "Em construção"],
                ["Previsão de entrega", "Outubro de 2028"],
                ["Metragens", "90 m² e 123 m²"],
                ["Vagas", "2"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 py-3">
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
            {[
              {
                t: "Planta de 90 m²",
                d: "Opção com proposta mais compacta dentro do empreendimento, duas vagas e configuração voltada à rotina residencial em Alphaville.",
              },
              {
                t: "Planta de 123 m²",
                d: "Opção com metragem ampliada, duas vagas e maior disponibilidade de espaço para diferentes configurações familiares.",
              },
            ].map((c) => (
              <article key={c.t} className="rounded-[16px] bg-[#EAEAE6] p-7 ring-1 ring-[#0D0D0D]/8">
                <Ruler className="h-5 w-5 text-[#0D0D0D]/50" />
                <h3 className="font-display mt-4 text-xl text-[#171717]">{c.t}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#1A1A1A]/75">{c.d}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.16em] text-[#1A1A1A]/45">2 vagas</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* MOMENTO + ANÁLISE */}
      <section className="bg-[#EAEAE6] px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2">
          <div className="rounded-[16px] bg-white p-7 ring-1 ring-[#0D0D0D]/8">
            <h2 className="font-display text-2xl text-[#171717]">Momento do empreendimento</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#1A1A1A]/75">
              O empreendimento está em construção, com previsão de entrega para outubro de 2028. Valores, condições de
              pagamento e unidades disponíveis devem ser confirmados com a equipe da S.A. Imóveis.
            </p>
          </div>
          <div className="rounded-[16px] bg-[#0D0D0D] p-7 text-white">
            <h2 className="font-display text-2xl">Análise da S.A. Imóveis</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/75">
              A escolha da unidade deve considerar metragem, andar, posição, incidência solar, vista, forma de pagamento
              e objetivo da compra. A equipe da S.A. Imóveis pode comparar as opções de 90 m² e 123 m² e verificar a
              disponibilidade atual.
            </p>
          </div>
        </div>
      </section>

      {/* UNIDADES DISPONÍVEIS */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-2xl text-[#171717] md:text-3xl">Unidades disponíveis</h2>
          <EmpreendimentoUnitsBlock empreendimentoSlug="andromeda-by-mpd" contactHref="#contato-andromeda" />
        </div>
      </section>

      {/* RELACIONADOS */}
      <section className="bg-[#EAEAE6] px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-2xl text-[#171717] md:text-3xl">Empreendimentos relacionados</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {RELATED.map((r) => (
              <Link
                key={r.slug}
                to="/empreendimentos/$slug"
                params={{ slug: r.slug }}
                className="rounded-[14px] bg-white p-6 ring-1 ring-[#0D0D0D]/8 transition hover:ring-[#0D0D0D]/25"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1A1A1A]/45">MPD</span>
                <p className="font-display mt-2 text-xl text-[#171717]">{r.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white px-6 py-16">
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
      <section id="contato-andromeda" className="scroll-mt-24 bg-[#0D0D0D] px-6 py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-display text-3xl leading-[1.1] md:text-4xl">Consulte unidades do Andrômeda by MPD</h2>
            <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-white/70">
              Receba informações atualizadas sobre disponibilidade, valores e condições de compra.
            </p>
          </div>
          <AndromedaLeadForm />
        </div>
      </section>
    </SiteLayout>
  );
}
