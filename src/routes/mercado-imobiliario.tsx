import { createFileRoute } from "@tanstack/react-router";
import { HubPageView, hubQO } from "@/components/hub-page";

const SLUG = "mercado-imobiliario";
const DEFAULTS = {
  eyebrow: "Mercado",
  title: "Mercado imobiliário da região",
  lead: "Análises, dados e perspectivas sobre o mercado imobiliário de alto padrão em Alphaville e arredores. Valorização, liquidez e movimentos do segmento residencial e corporativo.",
  cards: [
    { eyebrow: "Valorização", title: "Condomínios mais valorizados", lead: "Ranking editorial baseado em dados de transação.", to: "/artigos/mercado-condominios-valorizados" },
    { eyebrow: "Locação", title: "Locação de alto padrão", lead: "Cenário, tickets e perfis de inquilino.", to: "/artigos/mercado-locacao" },
    { eyebrow: "Corporativo", title: "Mercado corporativo", lead: "Salas comerciais, galpões e o eixo Castelo Branco.", to: "/artigos/mercado-corporativo" },
  ],
};

export const Route = createFileRoute("/mercado-imobiliario")({
  loader: ({ context }) => context.queryClient.ensureQueryData(hubQO(SLUG)),
  head: () => ({
    meta: [
      { title: "Mercado Imobiliário de Alphaville — S.A Imóveis Alphaville" },
      { name: "description", content: "Análises de mercado imobiliário em Alphaville, Tamboré, Barueri e Santana de Parnaíba: valorização, liquidez e oportunidades." },
      { property: "og:title", content: "Mercado Imobiliário de Alphaville" },
      { property: "og:description", content: "Análises do mercado imobiliário regional." },
      { property: "og:url", content: "/mercado-imobiliario" },
    ],
    links: [{ rel: "canonical", href: "/mercado-imobiliario" }],
  }),
  component: () => <HubPageView slug={SLUG} defaults={DEFAULTS} breadcrumbs={[{ label: "Mercado Imobiliário" }]} />,
});
