import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Building2, CheckCircle2, MessageCircle } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { MpdLeadForm } from "@/components/partners/mpd-lead-form";
import { resolveImage } from "@/lib/image-fallbacks";

const URL = "https://alphaville-vantage.lovable.app/parceiros/mpd";
const TITLE = "MPD Alphaville: empreendimentos e imóveis disponíveis";
const DESC =
  "Veja empreendimentos da MPD em Alphaville, consulte lançamentos, unidades prontas e oportunidades com a equipe da S.A. Imóveis.";

const DEVELOPMENTS = [
  {
    slug: "andromeda-by-mpd",
    name: "Andrômeda by MPD",
    location: "Alphaville, Barueri",
    status: "Lançamento",
    sizes: "Metragens amplas, plantas variadas",
    text: "Projeto contemporâneo com áreas comuns completas e plantas pensadas para quem busca conforto e boa circulação.",
  },
  {
    slug: "terrah-alphaville",
    name: "Terrah Alphaville",
    location: "Alphaville, Barueri",
    status: "Em construção",
    sizes: "Opções compactas e médias",
    text: "Empreendimento com foco em praticidade e localização, indicado para moradia e para investimento na região.",
  },
  {
    slug: "flora-alphaville",
    name: "Florá Alphaville",
    location: "Alphaville, Barueri",
    status: "Em construção",
    sizes: "Plantas intermediárias",
    text: "Arquitetura integrada ao verde da região, com espaços de convivência e proposta residencial equilibrada.",
  },
  {
    slug: "neo-alphaville",
    name: "Neo Alphaville",
    location: "Alphaville, Barueri",
    status: "Unidades prontas",
    sizes: "Diversas metragens disponíveis",
    text: "Unidades prontas para morar, com possibilidade de revendas e oportunidades pontuais na região.",
  },
];

const BENEFITS = [
  "Comparar plantas e empreendimentos lado a lado",
  "Verificar quais unidades estão realmente disponíveis",
  "Consultar valores e condições atualizados",
  "Avaliar localização, andar, posição solar e perfil do imóvel",
  "Encontrar lançamentos, imóveis prontos e revendas",
];

export const Route = createFileRoute("/parceiros/mpd")({
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
  }),
  component: MpdPartnerPage,
});

function MpdPartnerPage() {
  return (
    <SiteLayout>
      {/* HERO */}
      <section className="bg-[#0D0D0D] px-6 py-20 md:py-28 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#F2DA00]">
            Empreendimentos · MPD
          </p>
          <h1 className="font-display max-w-[20ch] text-4xl leading-[1.05] md:text-6xl">
            Empreendimentos MPD em Alphaville
          </h1>
          <p className="mt-6 max-w-[62ch] text-base leading-relaxed text-white/70">
            Lançamentos, imóveis em construção e unidades prontas em Alphaville e região.
            A equipe da S.A. Imóveis acompanha cada etapa, da comparação de plantas à
            consulta de disponibilidade.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="#empreendimentos"
              className="inline-flex items-center gap-2 bg-[#F2DA00] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0D0D0D] transition hover:brightness-95"
            >
              <Building2 className="h-4 w-4" /> Ver empreendimentos
            </a>
            <a
              href="#contato-mpd"
              className="inline-flex items-center gap-2 border border-white/25 px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition hover:border-[#F2DA00] hover:text-[#F2DA00]"
            >
              <MessageCircle className="h-4 w-4" /> Falar com um corretor
            </a>
          </div>
        </div>
      </section>

      {/* INSTITUCIONAL */}
      <section className="bg-[#EAEAE6] px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#0D0D0D]/50">
              Sobre a MPD
            </p>
            <h2 className="font-display mt-3 text-3xl leading-tight text-[#171717] md:text-4xl">
              Uma incorporadora presente em Alphaville e região
            </h2>
          </div>
          <div className="space-y-4 text-[15px] leading-relaxed text-[#1A1A1A]/75">
            <p>
              A MPD é uma incorporadora com atuação no mercado residencial de alto padrão da
              Grande São Paulo, com projetos que combinam arquitetura contemporânea, áreas
              comuns bem resolvidas e implantação cuidadosa no entorno.
            </p>
            <p>
              Em Alphaville, Tamboré e cidades vizinhas, seus empreendimentos dialogam com o
              perfil da região: circulação viária organizada, presença de verde, serviços
              próximos e demanda constante por moradia e investimento.
            </p>
          </div>
        </div>
      </section>

      {/* EMPREENDIMENTOS */}
      <section id="empreendimentos" className="scroll-mt-24 bg-[#F4F3EF] px-6 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#0D0D0D]/50">
            Portfólio
          </p>
          <h2 className="font-display mt-3 text-3xl leading-tight text-[#171717] md:text-4xl">
            Empreendimentos MPD
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {DEVELOPMENTS.map((d) => (
              <article
                key={d.slug}
                className="group flex h-full flex-col overflow-hidden rounded-[16px] bg-white ring-1 ring-[#0D0D0D]/8 shadow-[0_14px_35px_-28px_rgba(13,13,13,0.6)] transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={resolveImage(null, { type: "condo", region: "alphaville", seed: d.slug })}
                    alt={`${d.name} — ${d.location}`}
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 768px) 88vw, (max-width: 1200px) 45vw, 24vw"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-[#F2DA00] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0D0D0D]">
                    {d.status}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2.5 p-6">
                  <h3 className="font-display text-[19px] leading-[1.25] text-[#171717]">{d.name}</h3>
                  <p className="text-sm text-[#1A1A1A]/55">{d.location}</p>
                  <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#1A1A1A]/45">
                    {d.sizes}
                  </p>
                  <p className="line-clamp-3 text-sm leading-relaxed text-[#1A1A1A]/70">{d.text}</p>
                  <Link
                    to="/empreendimentos/$slug"
                    params={{ slug: d.slug }}
                    className="mt-auto inline-flex items-center gap-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0D0D0D] hover:text-[#0D0D0D]/60"
                  >
                    Ver empreendimento
                    <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-8 text-xs text-[#1A1A1A]/50">
            Disponibilidade, valores e condições sujeitos à confirmação com a equipe da S.A. Imóveis.
          </p>
        </div>
      </section>

      {/* POR QUE */}
      <section className="bg-[#EAEAE6] px-6 py-16 md:py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display max-w-[24ch] text-3xl leading-tight text-[#171717] md:text-4xl">
            Por que procurar um empreendimento MPD com a S.A. Imóveis
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <li
                key={b}
                className="flex items-start gap-3 rounded-2xl bg-white p-5 text-sm leading-relaxed text-[#1A1A1A]/75 ring-1 ring-[#0D0D0D]/8"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0D0D0D]" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section id="contato-mpd" className="scroll-mt-24 bg-[#0D0D0D] px-6 py-16 md:py-24 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-display max-w-[20ch] text-3xl leading-tight md:text-4xl">
              Encontre uma oportunidade em um empreendimento MPD
            </h2>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-white/70">
              Fale com a equipe da S.A. Imóveis para consultar unidades, valores e condições
              atualizadas.
            </p>
            <p className="mt-6 text-xs text-white/45">
              Disponibilidade, valores e condições sujeitos à confirmação com a equipe da S.A. Imóveis.
            </p>
          </div>
          <MpdLeadForm />
        </div>
      </section>
    </SiteLayout>
  );
}
