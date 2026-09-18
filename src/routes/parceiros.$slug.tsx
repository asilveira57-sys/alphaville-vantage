import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight, Building2, MessageCircle } from "lucide-react";
import { getEditorialBySlug } from "@/lib/editorial.functions";
import {
  getDevelopmentPartner,
  listPartnerEmpreendimentos,
} from "@/lib/development-partners.functions";
import { CmsEditorialPage } from "@/components/cms-editorial-page";
import { SiteLayout } from "@/components/site-layout";
import { PartnerLeadForm } from "@/components/partners/partner-lead-form";

const SITE = "https://alphaville-vantage.lovable.app";

const pageQO = (slug: string) =>
  queryOptions({
    queryKey: ["editorial", "parceiro", slug],
    queryFn: () => getEditorialBySlug({ data: { slug } }),
  });

const partnerQO = (slug: string) =>
  queryOptions({
    queryKey: ["development-partner", slug],
    queryFn: async () => {
      const partner = await getDevelopmentPartner({ data: { slug } });
      if (!partner) return null;
      const empreendimentos = await listPartnerEmpreendimentos({
        data: { slugs: partner.empreendimento_slugs },
      });
      return { partner, empreendimentos };
    },
  });

export const Route = createFileRoute("/parceiros/$slug")({
  loader: async ({ params, context }) => {
    const page = await context.queryClient.ensureQueryData(pageQO(params.slug));
    if (page && page.content_type === "parceiro") return { kind: "editorial" as const, page };
    const dyn = await context.queryClient.ensureQueryData(partnerQO(params.slug));
    if (dyn) return { kind: "partner" as const, ...dyn };
    throw notFound();
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Parceiro não encontrado" }, { name: "robots", content: "noindex" }] };
    }
    const url = `${SITE}/parceiros/${params.slug}`;
    if (loaderData.kind === "partner") {
      const p = loaderData.partner;
      const title = `${p.name}: empreendimentos e imóveis — S.A Imóveis Alphaville`;
      const description =
        p.description ??
        `Veja empreendimentos da ${p.name} em Alphaville e região com a equipe da S.A. Imóveis.`;
      return {
        meta: [
          { title },
          { name: "description", content: description },
          { property: "og:title", content: title },
          { property: "og:description", content: description },
          { property: "og:type", content: "website" },
          { property: "og:url", content: url },
          { name: "twitter:card", content: "summary_large_image" },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const p = loaderData.page;
    const title = p.meta_title ?? `${p.title} — S.A Imóveis Alphaville`;
    const description = p.meta_description ?? p.excerpt ?? "";
    const image = p.og_image ?? p.featured_image ?? undefined;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: p.og_title ?? p.title },
        { property: "og:description", content: p.og_description ?? description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: p.canonical_url || url }],
    };
  },
  component: PartnerPage,
});

function PartnerPage() {
  const { slug } = Route.useParams();
  const { data: page } = useSuspenseQuery(pageQO(slug));
  if (page && page.content_type === "parceiro") {
    return <CmsEditorialPage page={page} parentLabel="Parceiros" parentTo="/parceiros/mpd" />;
  }
  return <DynamicPartnerLanding slug={slug} />;
}

function DynamicPartnerLanding({ slug }: { slug: string }) {
  const { data } = useSuspenseQuery(partnerQO(slug));
  if (!data) return null;
  const { partner, empreendimentos } = data;

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="bg-[#0D0D0D] px-6 py-20 md:py-28 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#F2DA00]">
            Empreendimentos · {partner.name}
          </p>
          {partner.logo_url ? (
            <img
              src={partner.logo_url}
              alt={`Logotipo ${partner.name}`}
              className="mb-6 h-14 w-auto object-contain"
            />
          ) : null}
          <h1 className="font-display max-w-[20ch] text-4xl leading-[1.05] md:text-6xl">
            Empreendimentos {partner.name} em Alphaville
          </h1>
          <p className="mt-6 max-w-[62ch] text-base leading-relaxed text-white/70">
            {partner.description ??
              `Lançamentos, imóveis em construção e unidades prontas da ${partner.name} em Alphaville e região. A equipe da S.A. Imóveis acompanha cada etapa, da comparação de plantas à consulta de disponibilidade.`}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="#empreendimentos"
              className="inline-flex items-center gap-2 bg-[#F2DA00] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0D0D0D] transition hover:brightness-95"
            >
              <Building2 className="h-4 w-4" /> Ver empreendimentos
            </a>
            <a
              href="#contato-parceiro"
              className="inline-flex items-center gap-2 border border-white/25 px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition hover:border-[#F2DA00] hover:text-[#F2DA00]"
            >
              <MessageCircle className="h-4 w-4" /> Falar com um corretor
            </a>
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
            Empreendimentos {partner.name}
          </h2>

          {empreendimentos.length === 0 ? (
            <p className="mt-8 border border-[#0D0D0D]/10 bg-white p-8 text-center text-sm text-[#1A1A1A]/60">
              Em breve: estamos reunindo os empreendimentos desta incorporadora. Fale com a equipe
              abaixo para receber as opções em primeira mão.
            </p>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {empreendimentos.map((d) => (
                <article
                  key={d.slug}
                  className="group flex h-full flex-col overflow-hidden rounded-[16px] bg-white ring-1 ring-[#0D0D0D]/8 shadow-[0_14px_35px_-28px_rgba(13,13,13,0.6)] transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#0D0D0D]">
                    {d.featured_image ? (
                      <img
                        src={d.featured_image}
                        alt={d.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center p-6 text-center">
                        <span className="font-display text-[22px] leading-tight text-white/85">
                          {d.title}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5 p-6">
                    <h3 className="font-display text-[19px] leading-[1.25] text-[#171717]">
                      {d.title}
                    </h3>
                    {d.excerpt ? (
                      <p className="line-clamp-3 text-sm leading-relaxed text-[#1A1A1A]/70">
                        {d.excerpt}
                      </p>
                    ) : null}
                    <Link
                      to={"/empreendimentos/$slug" as never}
                      params={{ slug: d.slug } as never}
                      className="mt-auto inline-flex items-center gap-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0D0D0D] hover:text-[#0D0D0D]/60"
                    >
                      Ver empreendimento
                      <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="mt-8 text-xs text-[#1A1A1A]/50">
            Disponibilidade, valores e condições sujeitos à confirmação com a equipe da S.A. Imóveis.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section id="contato-parceiro" className="scroll-mt-24 bg-[#0D0D0D] px-6 py-16 md:py-24 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-display max-w-[20ch] text-3xl leading-tight md:text-4xl">
              Encontre uma oportunidade em um empreendimento {partner.name}
            </h2>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-white/70">
              Fale com a equipe da S.A. Imóveis para consultar unidades, valores e condições
              atualizadas.
            </p>
          </div>
          <PartnerLeadForm
            partnerSlug={partner.slug}
            partnerName={partner.name}
            empreendimentos={empreendimentos.map((e) => ({ slug: e.slug, title: e.title }))}
          />
        </div>
      </section>
    </SiteLayout>
  );
}
