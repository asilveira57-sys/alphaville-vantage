import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle, Building2, MapPin, CalendarClock, Ruler, Car, HardHat } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { EmpreendimentoUnitsBlock } from "@/components/empreendimentos/units-block";
import { EmpreendimentoGalleryBlock } from "@/components/empreendimentos/gallery-block";
import { EmpreendimentoCoverImage } from "@/components/empreendimentos/cover-image";
import { EmpreendimentoPlansBlock } from "@/components/empreendimentos/plans-block";
import { NeoLeadForm } from "@/components/partners/neo-lead-form";
import neoLogo from "@/assets/neo-alphaville-logo.png.asset.json";

const SITE = "https://alphaville-vantage.lovable.app";
const URL = `${SITE}/empreendimentos/neo-alphaville`;
const TITLE = "Neo Alphaville: unidades prontas na Avenida Sagitário";
const DESC =
  "Veja informações do Neo Alphaville, empreendimento entregue na Avenida Sagitário, com unidades prontas e atendimento da S.A. Imóveis.";

/** Imagem principal específica do Neo Alphaville (material oficial do empreendimento). */
const HERO_IMAGE: string | null = neoLogo.url;
/** Galeria específica do Neo: fachada, plantas, áreas comuns e unidades. */
const GALLERY: { url: string; alt: string }[] = [];

const SPECS: [string, string][] = [
  ["Construção", "MPD Engenharia"],
  ["Realização", "Albino Nunes e MPD Engenharia"],
  ["Endereço", "Avenida Sagitário, 215"],
  ["Bairro", "Alphaville Empresarial, Barueri"],
  ["Status", "Entregue"],
  ["Entrega informada", "Setembro de 2025"],
  ["Área do terreno", "5.184,62 m²"],
  ["Total de unidades", "115"],
  ["Arquitetura", "MCAA"],
  ["Decoração", "Carlos Rossi"],
  ["Paisagismo", "Beth Miyazaki"],
];

const TYPOLOGIES = [
  { t: "Apartamento de 239 m²", d: "Tipologia residencial com 4 suítes e 4 vagas, conforme a ficha técnica do empreendimento." },
  { t: "Apartamento de 244 m²", d: "Tipologia residencial com 4 suítes e 4 vagas, conforme a ficha técnica do empreendimento." },
  { t: "Penthouse de 362 m²", d: "Tipologia penthouse com 4 suítes e 4 vagas." },
  { t: "Duplex de 432 m²", d: "Tipologia duplex com 4 suítes e 5 vagas." },
];

const FAQ = [
  {
    q: "Onde fica o Neo Alphaville?",
    a: "O empreendimento fica na Avenida Sagitário, 215, no Alphaville Empresarial, em Barueri.",
  },
  {
    q: "O Neo Alphaville está pronto?",
    a: "Sim. O empreendimento está entregue, com entrega informada na tabela comercial em setembro de 2025.",
  },
  {
    q: "Quais são as tipologias do empreendimento?",
    a: "A ficha técnica informa unidades de 239 m² e 244 m², penthouse de 362 m² e duplex de 432 m², com 4 suítes e 4 ou 5 vagas conforme a tipologia.",
  },
  {
    q: "Existem unidades disponíveis para compra?",
    a: "A disponibilidade varia. As unidades vinculadas ao empreendimento aparecem no bloco “Unidades atualmente cadastradas”; quando não houver, consulte a equipe da S.A. Imóveis.",
  },
  {
    q: "O Neo possui unidades de revenda?",
    a: "Por ser um empreendimento entregue, as oportunidades podem incluir unidades remanescentes, revendas ou imóveis de proprietários, conforme o cadastro atualizado da S.A. Imóveis.",
  },
  {
    q: "Como consultar valores atualizados?",
    a: "Valores, condições e disponibilidade devem ser confirmados diretamente com a equipe da S.A. Imóveis.",
  },
];

const RELATED = [
  { slug: "andromeda-by-mpd", name: "Andrômeda by MPD" },
  { slug: "terrah-alphaville", name: "Terrah Alphaville" },
  { slug: "flora-alphaville", name: "Florá Alphaville" },
];

export const Route = createFileRoute("/empreendimentos/neo-alphaville")({
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
          name: "Neo Alphaville",
          url: URL,
          numberOfAccommodationUnits: 115,
          address: {
            "@type": "PostalAddress",
            streetAddress: "Avenida Sagitário, 215",
            addressLocality: "Barueri",
            addressRegion: "SP",
            addressCountry: "BR",
          },
          floorSize: [
            { "@type": "QuantitativeValue", value: 239, unitCode: "MTK" },
            { "@type": "QuantitativeValue", value: 244, unitCode: "MTK" },
            { "@type": "QuantitativeValue", value: 362, unitCode: "MTK" },
            { "@type": "QuantitativeValue", value: 432, unitCode: "MTK" },
          ],
          amenityFeature: [
            { "@type": "LocationFeatureSpecification", name: "Suítes", value: "4" },
            { "@type": "LocationFeatureSpecification", name: "Vagas de garagem", value: "4 ou 5" },
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
  component: NeoPage,
});

function NeoPage() {
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
          <h1 className="font-display mt-6 max-w-[20ch] text-4xl leading-[1.05] md:text-5xl">Neo Alphaville</h1>
          <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-white/75">
            Empreendimento entregue na Avenida Sagitário, em uma das localizações centrais de Alphaville.
          </p>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[13px] text-white/80">
            <li className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#F2DA00]" /> Alphaville Empresarial, Barueri</li>
            <li className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[#F2DA00]" /> Empreendimento entregue</li>
            <li className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#F2DA00]" /> Avenida Sagitário, 215</li>
            <li className="inline-flex items-center gap-2"><Building2 className="h-4 w-4 text-[#F2DA00]" /> 115 unidades</li>
            <li className="inline-flex items-center gap-2"><Ruler className="h-4 w-4 text-[#F2DA00]" /> Tipologias amplas</li>
            <li className="inline-flex items-center gap-2"><HardHat className="h-4 w-4 text-[#F2DA00]" /> Construção: MPD Engenharia</li>
          </ul>

          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#contato-neo"
              className="inline-flex items-center gap-2 bg-[#F2DA00] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0D0D0D] transition hover:brightness-95"
            >
              Consultar unidades disponíveis
            </a>
            <a
              href="#contato-neo"
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
            <EmpreendimentoCoverImage
              empreendimentoSlug="neo-alphaville"
              alt="Neo Alphaville, na Avenida Sagitário, Alphaville Empresarial, Barueri"
              fallback={HERO_IMAGE ? (
              <div className="grid aspect-[16/10] w-full place-items-center rounded-[16px] bg-white p-10 ring-1 ring-[#0D0D0D]/8">
                <img
                  src={HERO_IMAGE}
                  alt="Neo Alphaville, na Avenida Sagitário, Alphaville Empresarial, Barueri"
                  loading="lazy"
                  decoding="async"
                  sizes="(max-width: 768px) 92vw, 55vw"
                  className="max-h-full w-full max-w-[420px] object-contain"
                />
              </div>
            ) : (
              <div className="grid aspect-[16/10] w-full place-items-center rounded-[16px] bg-[#0D0D0D]/5 text-center ring-1 ring-[#0D0D0D]/10">
                <div>
                  <Building2 className="mx-auto h-8 w-8 text-[#0D0D0D]/35" />
                  <p className="mt-3 font-display text-xl text-[#171717]">Neo Alphaville</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#1A1A1A]/45">
                    Imagens oficiais em breve
                  </p>
                </div>
              </div>
            )}
            />

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
              O Neo Alphaville é um empreendimento residencial entregue, localizado na Avenida Sagitário, em Alphaville
              Empresarial. O projeto possui 115 unidades e reúne diferentes configurações residenciais, incluindo
              apartamentos amplos, duplex e penthouse. A disponibilidade atual deve ser confirmada diretamente com a
              equipe da S.A. Imóveis.
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

      {/* TIPOLOGIAS DO PROJETO */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-2xl text-[#171717] md:text-3xl">Tipologias do projeto</h2>
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

      {/* MOMENTO + LOCALIZAÇÃO */}
      <section className="bg-[#EAEAE6] px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2">
          <div className="rounded-[16px] bg-white p-7 ring-1 ring-[#0D0D0D]/8">
            <h2 className="font-display text-2xl text-[#171717]">Momento do empreendimento</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#1A1A1A]/75">
              O Neo Alphaville está entregue. As oportunidades disponíveis podem incluir unidades remanescentes,
              revendas ou imóveis de proprietários, conforme o cadastro atualizado da S.A. Imóveis.
            </p>
          </div>
          <div className="rounded-[16px] bg-white p-7 ring-1 ring-[#0D0D0D]/8">
            <h2 className="font-display text-2xl text-[#171717]">Neo na Avenida Sagitário</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#1A1A1A]/75">
              O empreendimento está localizado na Avenida Sagitário, em Alphaville Empresarial, região com concentração
              de serviços, comércio e acesso às principais áreas de Alphaville.
            </p>
          </div>
        </div>
      </section>

      {/* ANÁLISE */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[16px] bg-[#0D0D0D] p-8 text-white">
            <h2 className="font-display text-2xl">Análise da S.A. Imóveis</h2>
            <p className="mt-3 max-w-[80ch] text-[15px] leading-relaxed text-white/75">
              Por ser um empreendimento entregue, a análise deve considerar estado da unidade, andar, posição, vista,
              reformas realizadas, valor de condomínio, vagas e condições de revenda. A equipe da S.A. Imóveis pode
              ajudar na comparação entre as oportunidades disponíveis.
            </p>
          </div>
        </div>
      </section>

      <EmpreendimentoGalleryBlock empreendimentoSlug="neo-alphaville" name="Neo Alphaville" />
      <EmpreendimentoPlansBlock empreendimentoSlug="neo-alphaville" name="Neo Alphaville" />

      {/* UNIDADES DISPONÍVEIS */}
      <section className="bg-[#EAEAE6] px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-2xl text-[#171717] md:text-3xl">Unidades atualmente cadastradas</h2>
          <p className="mt-2 max-w-[70ch] text-[14px] leading-relaxed text-[#1A1A1A]/65">
            Unidades vinculadas exatamente a esta página no cadastro da S.A. Imóveis. Valores e condições devem ser
            confirmados com a equipe.
          </p>
          <EmpreendimentoUnitsBlock empreendimentoSlug="neo-alphaville" contactHref="#contato-neo" />
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
      <section id="contato-neo" className="scroll-mt-24 bg-[#0D0D0D] px-6 py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-display text-3xl leading-[1.1] md:text-4xl">Consulte unidades do Neo Alphaville</h2>
            <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-white/70">
              Receba informações atualizadas sobre unidades prontas, revendas, valores e condições de compra.
            </p>
          </div>
          <NeoLeadForm />
        </div>
      </section>
    </SiteLayout>
  );
}
