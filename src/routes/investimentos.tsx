import { createFileRoute, redirect } from "@tanstack/react-router";

/** Página provisória ("em breve") substituída pelo conteúdo real em 17/11/2026: redireciona com 301. */
export const Route = createFileRoute("/investimentos")({
  loader: () => {
    throw redirect({ href: "/mercado-imobiliario", statusCode: 301 });
  },
  component: () => null,
});
