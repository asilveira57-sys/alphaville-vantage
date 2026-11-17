import { createFileRoute } from "@tanstack/react-router";
import { HubPageView, hubQO } from "@/components/hub-page";
import { GuiaCrossNav, regionGuideImagesQO } from "@/components/guia-cross-nav";

const SLUG = "guia-tambore";
const DEFAULTS = {
  eyebrow: "Guia Regional",
  title: "Tamboré em profundidade",
  lead: "Considerada uma das regiões de maior valorização do estado de São Paulo, o Tamboré reúne residenciais com arquitetura contemporânea, clubes privativos e infraestrutura de excelência.",
  cards: [
    { eyebrow: "Bairro", title: "Morar no Tamboré", lead: "Bairro, condomínios e perfil de quem mora.", to: "/guia/tambore-barueri" },
    { eyebrow: "Clubes", title: "Estrutura esportiva e social", lead: "Golfe, equitação, tênis e clubes familiares.", to: "/blog/tambore-clubes" },
    { eyebrow: "Mercado", title: "Valorização e liquidez", lead: "Por que o Tamboré tem o m² mais disputado.", to: "/blog/tambore-mercado" },
  ],
};

export const Route = createFileRoute("/guia-tambore")({
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(hubQO(SLUG)),
    context.queryClient.ensureQueryData(regionGuideImagesQO),
  ]),
  head: () => ({
    meta: [
      { title: "Guia Tamboré — S.A Imóveis Alphaville" },
      { name: "description", content: "Guia completo do Tamboré: residenciais de luxo, clubes, escolas e mercado imobiliário em valorização." },
      { property: "og:title", content: "Guia Tamboré — S.A Imóveis Alphaville" },
      { property: "og:description", content: "Tudo sobre o Tamboré: residenciais, clubes e mercado." },
      { property: "og:url", content: "/guia-tambore" },
    ],
    links: [{ rel: "canonical", href: "/guia-tambore" }],
  }),
  component: () => (
    <HubPageView slug={SLUG} defaults={DEFAULTS} breadcrumbs={[{ label: "Guia Tamboré" }]}>
      <GuiaCrossNav currentTo="/guia-tambore" />
    </HubPageView>
  ),
});
