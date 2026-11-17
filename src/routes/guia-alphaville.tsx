import { createFileRoute } from "@tanstack/react-router";
import { HubPageView, hubQO } from "@/components/hub-page";
import { GuiaCrossNav, regionGuideImagesQO } from "@/components/guia-cross-nav";

const SLUG = "guia-alphaville";
const DEFAULTS = {
  eyebrow: "Guia Regional",
  title: "Alphaville em profundidade",
  lead: "O dossiê completo sobre o primeiro grande complexo de condomínios fechados do Brasil: história, residenciais, escolas, gastronomia, lazer e mercado imobiliário.",
  cards: [
    { eyebrow: "Residenciais", title: "Os primeiros condomínios", lead: "Como surgiram os Residenciais 1, 2 e 3 e por que continuam icônicos.", to: "/blog/alphaville-residenciais-pioneiros" },
    { eyebrow: "Educação", title: "Principais escolas particulares", lead: "Da educação infantil ao ensino médio bilíngue.", to: "/temas/educacao" },
    { eyebrow: "Gastronomia", title: "Gastronomia da região", lead: "Restaurantes, pizzarias e sushi em Alphaville e arredores.", to: "/temas/gastronomia" },
    { eyebrow: "Lazer", title: "Parques e clubes", lead: "Estrutura esportiva, áreas verdes e centros sociais.", to: "/blog/alphaville-parques-clubes" },
    { eyebrow: "Bairros", title: "Onde morar em Alphaville", lead: "Barueri, Santana de Parnaíba e Tamboré: qual lado combina com você.", to: "/guia/os-melhores-bairros-para-morar-em-alphaville-guia-completo-para-escolher-a-regia" },
    { eyebrow: "Saúde", title: "Hospitais e clínicas de referência", lead: "Rede médica que atende a região.", to: "/blog/hospitais-e-clinicas-de-referencia-em-alphaville" },
  ],
};

export const Route = createFileRoute("/guia-alphaville")({
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(hubQO(SLUG)),
    context.queryClient.ensureQueryData(regionGuideImagesQO),
  ]),
  head: () => ({
    meta: [
      { title: "Guia Alphaville — S.A Imóveis Alphaville" },
      { name: "description", content: "Guia completo de Alphaville: condomínios, escolas, gastronomia, lazer, mobilidade e qualidade de vida." },
      { property: "og:title", content: "Guia Alphaville — S.A Imóveis Alphaville" },
      { property: "og:description", content: "Tudo sobre Alphaville: condomínios, escolas, gastronomia e estilo de vida." },
      { property: "og:url", content: "/guia-alphaville" },
    ],
    links: [{ rel: "canonical", href: "/guia-alphaville" }],
  }),
  component: () => (
    <HubPageView slug={SLUG} defaults={DEFAULTS} breadcrumbs={[{ label: "Guia Alphaville" }]}>
      <GuiaCrossNav currentTo="/guia-alphaville" />
    </HubPageView>
  ),
});
