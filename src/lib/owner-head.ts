import { SITE_URL } from "@/lib/site";
import { radarJsonLd } from "@/components/radar/radar-landing";
import { OWNER_HUB, ownerPage, type OwnerPage } from "@/lib/owner-pages";

export function ownerHead(path: OwnerPage["path"]) {
  const page = ownerPage(path);
  const url = `${SITE_URL}${path}`;
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
      { name: "Anuncie seu imóvel", url: `${SITE_URL}/anuncie-seu-imovel` },
      { name: page.label, url },
    ]),
  };
}

export { OWNER_HUB };
