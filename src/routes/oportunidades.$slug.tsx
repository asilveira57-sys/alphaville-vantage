import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * URL de campanha (e-mail, WhatsApp, mídia kit) para uma oportunidade.
 *
 * Não é uma segunda ficha do imóvel: duas URLs para o mesmo imóvel competem
 * entre si e diluem sinais de SEO. Redirecionamento permanente é o sinal de
 * canonicalização mais forte que o Google reconhece — a ficha canônica
 * continua sendo /imoveis/{slug}, que ganha o layout de oportunidade quando
 * o imóvel está publicado na vitrine.
 */
export const Route = createFileRoute("/oportunidades/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/imoveis/$slug",
      params: { slug: params.slug },
      statusCode: 301,
    });
  },
});
