import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getEditorialBySlug } from "@/lib/editorial.functions";
import { CmsEditorialPage } from "@/components/cms-editorial-page";

const SITE = "https://alphaville-vantage.lovable.app";

const pageQO = (slug: string) =>
  queryOptions({
    queryKey: ["editorial", "parceiro", slug],
    queryFn: () => getEditorialBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/parceiros/$slug")({
  loader: async ({ params, context }) => {
    const page = await context.queryClient.ensureQueryData(pageQO(params.slug));
    if (!page || page.content_type !== "parceiro") throw notFound();
    return { page };
  },
  head: ({ params, loaderData }) => {
    const p = loaderData?.page;
    if (!p) return { meta: [{ title: "Parceiro não encontrado" }, { name: "robots", content: "noindex" }] };
    const url = `${SITE}/parceiros/${params.slug}`;
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
  component: PartnerCmsPage,
});

function PartnerCmsPage() {
  const { slug } = Route.useParams();
  const { data: page } = useSuspenseQuery(pageQO(slug));
  if (!page) return null;
  return <CmsEditorialPage page={page} parentLabel="Parceiros" parentTo="/parceiros/mpd" />;
}
