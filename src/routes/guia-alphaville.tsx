import { createFileRoute } from "@tanstack/react-router";
import { HubPageView, hubQO } from "@/components/hub-page";
import { GuiaCrossNav } from "@/components/guia-cross-nav";

const SLUG = "guia-alphaville";
const DEFAULTS = {
  eyebrow: "Guia Regional",
  title: "Alphaville em profundidade",
  lead: "O dossiê completo sobre o primeiro grande complexo de condomínios fechados do Brasil: história, residenciais, escolas, gastronomia, lazer e mercado imobiliário.",
  cards: [
    { eyebrow: "Residenciais", title: "Os primeiros condomínios", lead: "Como surgiram os Residenciais 1, 2 e 3 e por que continuam icônicos.", to: "/artigos/alphaville-residenciais-pioneiros" },
    { eyebrow: "Educação", title: "Principais escolas particulares", lead: "Da educação infantil ao ensino médio bilíngue.", to: "/artigos/alphaville-escolas" },
    { eyebrow: "Gastronomia", title: "Restaurantes do Calçadão", lead: "Da culinária autoral às pizzarias clássicas.", to: "/artigos/alphaville-calcadao" },
    { eyebrow: "Lazer", title: "Parques e clubes", lead: "Estrutura esportiva, áreas verdes e centros sociais.", to: "/artigos/alphaville-parques-clubes" },
    { eyebrow: "Mobilidade", title: "Castelo Branco e Rodoanel", lead: "Acessos, fluxo e o futuro da mobilidade local.", to: "/artigos/alphaville-mobilidade" },
    { eyebrow: "Saúde", title: "Hospitais e clínicas de referência", lead: "Rede médica que atende a região.", to: "/artigos/alphaville-saude" },
  ],
};

export const Route = createFileRoute("/guia-alphaville")({
  loader: ({ context }) => context.queryClient.ensureQueryData(hubQO(SLUG)),
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
