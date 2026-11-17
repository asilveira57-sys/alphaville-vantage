import { createFileRoute, redirect } from "@tanstack/react-router";

/** Página provisória ("em breve") substituída pelo conteúdo real em 17/11/2026: redireciona com 301. */
export const Route = createFileRoute("/restaurantes")({
  loader: () => {
    throw redirect({ href: "/temas/gastronomia", statusCode: 301 });
  },
  component: () => null,
});
