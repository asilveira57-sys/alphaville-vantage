import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { resolveImage } from "@/lib/image-fallbacks";

const SITE = "https://alphaville-vantage.lovable.app";

const DEVELOPMENTS: Record<
  string,
  { name: string; location: string; status: string; sizes: string; text: string }
> = {
  "andromeda-by-mpd": {
    name: "Andrômeda by MPD",
    location: "Alphaville, Barueri",
    status: "Lançamento",
    sizes: "Metragens amplas, plantas variadas",
    text: "Projeto contemporâneo com áreas comuns completas e plantas pensadas para conforto e boa circulação.",
  },
  "terrah-alphaville": {
    name: "Terrah Alphaville",
    location: "Alphaville, Barueri",
    status: "Em construção",
    sizes: "Opções compactas e médias",
    text: "Empreendimento com foco em praticidade e localização, indicado para moradia e investimento.",
  },
  "flora-alphaville": {
    name: "Florá Alphaville",
    location: "Alphaville, Barueri",
    status: "Em construção",
    sizes: "Plantas intermediárias",
    text: "Arquitetura integrada ao verde da região, com espaços de convivência e proposta residencial equilibrada.",
  },
  "neo-alphaville": {
    name: "Neo Alphaville",
    location: "Alphaville, Barueri",
    status: "Unidades prontas",
    sizes: "Diversas metragens disponíveis",
    text: "Unidades prontas para morar, com possibilidade de revendas e oportunidades pontuais na região.",
  },
};

export const Route = createFileRoute("/empreendimentos/$slug")({
  loader: ({ params }) => {
    const item = DEVELOPMENTS[params.slug];
    if (!item) throw notFound();
    return { item, slug: params.slug };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Empreendimento não encontrado" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.item.name} — Alphaville | S.A Imóveis`;
    const desc = `${loaderData.item.name} em ${loaderData.item.location}. ${loaderData.item.text} Consulte disponibilidade com a equipe da S.A. Imóveis.`;
    const url = `${SITE}/empreendimentos/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: DevelopmentPage,
});

function DevelopmentPage() {
  const { item, slug } = Route.useLoaderData();
  return (
    <SiteLayout>
      <section className="bg-[#0D0D0D] px-6 py-20 md:py-24 text-white">
        <div className="mx-auto max-w-7xl">
          <Link
            to="/parceiros/mpd"
            className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60 hover:text-[#F2DA00]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Empreendimentos MPD
          </Link>
          <h1 className="font-display mt-6 max-w-[20ch] text-4xl leading-[1.05] md:text-5xl">
            {item.name}
          </h1>
          <p className="mt-4 text-sm uppercase tracking-[0.18em] text-[#F2DA00]">
            {item.location} · {item.status}
          </p>
          <p className="mt-6 max-w-[60ch] text-base leading-relaxed text-white/70">{item.text}</p>
        </div>
      </section>

      <section className="bg-[#EAEAE6] px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <img
            src={resolveImage(null, { type: "condo", region: "alphaville", seed: slug })}
            alt={`${item.name} — ${item.location}`}
            loading="lazy"
            decoding="async"
            sizes="(max-width: 768px) 92vw, 55vw"
            className="aspect-[16/10] w-full rounded-[16px] object-cover ring-1 ring-[#0D0D0D]/8"
          />
          <div className="space-y-4 text-[15px] leading-relaxed text-[#1A1A1A]/75">
            <h2 className="font-display text-2xl text-[#171717]">Informações gerais</h2>
            <p><strong className="text-[#171717]">Localização:</strong> {item.location}</p>
            <p><strong className="text-[#171717]">Status:</strong> {item.status}</p>
            <p><strong className="text-[#171717]">Metragens:</strong> {item.sizes}</p>
            <p className="text-xs text-[#1A1A1A]/50">
              Disponibilidade, valores e condições sujeitos à confirmação com a equipe da S.A. Imóveis.
            </p>
            <Link
              to="/parceiros/mpd"
              hash="contato-mpd"
              className="inline-flex items-center gap-2 bg-[#0D0D0D] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#1A1A1A]"
            >
              <MessageCircle className="h-4 w-4" /> Consultar disponibilidade
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
