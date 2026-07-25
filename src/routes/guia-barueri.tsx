import { createFileRoute } from "@tanstack/react-router";
import { HubPageView, hubQO } from "@/components/hub-page";
import { GuiaCrossNav } from "@/components/guia-cross-nav";

const SLUG = "guia-barueri";
const DEFAULTS = {
  eyebrow: "Guia Regional",
  title: "Barueri em profundidade",
  lead: "Mais que cidade-sede de Alphaville, Barueri é um dos maiores polos corporativos do país. Conheça sua história, benefícios fiscais, empresas instaladas e a infraestrutura que sustenta a região.",
  cards: [
    { eyebrow: "Economia", title: "Benefícios fiscais de Barueri", lead: "Por que empresas escolhem se instalar na cidade.", to: "/artigos/barueri-beneficios-fiscais" },
    { eyebrow: "Empresas", title: "Grandes corporações instaladas", lead: "Panorama do mercado de trabalho local.", to: "/artigos/barueri-corporacoes" },
    { eyebrow: "Mobilidade", title: "Castelo Branco e Rodoanel", lead: "Eixos de acesso e o futuro do transporte.", to: "/artigos/barueri-mobilidade" },
  ],
};

export const Route = createFileRoute("/guia-barueri")({
  loader: ({ context }) => context.queryClient.ensureQueryData(hubQO(SLUG)),
  head: () => ({
    meta: [
      { title: "Guia Barueri — S.A Imóveis Alphaville" },
      { name: "description", content: "Guia completo de Barueri: história, mercado corporativo, benefícios fiscais, mobilidade e qualidade de vida." },
      { property: "og:title", content: "Guia Barueri — S.A Imóveis Alphaville" },
      { property: "og:description", content: "Tudo sobre Barueri: economia, empresas e estilo de vida." },
      { property: "og:url", content: "/guia-barueri" },
    ],
    links: [{ rel: "canonical", href: "/guia-barueri" }],
  }),
  component: () => (
    <HubPageView slug={SLUG} defaults={DEFAULTS} breadcrumbs={[{ label: "Guia Barueri" }]}>
      <GuiaCrossNav currentTo="/guia-barueri" />
    </HubPageView>
  ),
});
