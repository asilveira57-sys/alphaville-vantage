import { createFileRoute, redirect } from "@tanstack/react-router";

/** Atalho sem ".html" para o protótipo estático do Mapa de Condomínios (public/mapa-prototipo.html). */
export const Route = createFileRoute("/mapa-prototipo")({
  loader: () => {
    throw redirect({ href: "/mapa-prototipo.html", statusCode: 302 });
  },
  component: () => null,
});
