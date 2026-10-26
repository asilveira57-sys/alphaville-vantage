import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { RADAR_HUB } from "@/lib/radar-pages";
import { RadarLanding, radarJsonLd } from "@/components/radar/radar-landing";

const URL = `${SITE_URL}/radar`;

export const Route = createFileRoute("/radar/")({
  head: () => ({
    meta: [
      { title: RADAR_HUB.title },
      { name: "description", content: RADAR_HUB.description },
      { property: "og:title", content: RADAR_HUB.title },
      { property: "og:description", content: RADAR_HUB.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: radarJsonLd(RADAR_HUB.faq, [
      { name: "Início", url: `${SITE_URL}/` },
      { name: "Radar", url: URL },
    ]),
  }),
  component: () => <RadarLanding h1={RADAR_HUB.h1} intro={RADAR_HUB.intro} faq={RADAR_HUB.faq} />,
});
