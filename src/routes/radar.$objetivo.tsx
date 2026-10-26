import { createFileRoute, notFound } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { radarPageBySlug } from "@/lib/radar-pages";
import { interestLabel } from "@/lib/radar-config";
import { RadarLanding, radarJsonLd } from "@/components/radar/radar-landing";

export const Route = createFileRoute("/radar/$objetivo")({
  loader: ({ params }) => {
    const page = radarPageBySlug(params.objetivo);
    if (!page) throw notFound();
    return { page };
  },
  head: ({ params, loaderData }) => {
    const page = loaderData?.page;
    if (!page) return { meta: [{ title: "Página não encontrada — Radar S.A. Imóveis" }, { name: "robots", content: "noindex" }] };
    const url = `${SITE_URL}/radar/${params.objetivo}`;
    return {
      meta: [
        { title: page.title },
        { name: "description", content: page.description },
        { property: "og:title", content: page.title },
        { property: "og:description", content: page.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: radarJsonLd(page.faq, [
        { name: "Início", url: `${SITE_URL}/` },
        { name: "Radar", url: `${SITE_URL}/radar` },
        { name: interestLabel(page.interest), url },
      ]),
    };
  },
  component: RadarObjetivoPage,
});

function RadarObjetivoPage() {
  const { page } = Route.useLoaderData();
  return (
    <RadarLanding
      key={page.slug}
      h1={page.h1}
      intro={page.intro}
      faq={page.faq}
      interest={page.interest}
      crumb={interestLabel(page.interest)}
    />
  );
}
