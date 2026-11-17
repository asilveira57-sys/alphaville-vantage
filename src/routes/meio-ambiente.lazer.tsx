import { createFileRoute, redirect } from "@tanstack/react-router";

/** Página provisória ("em breve") substituída pelo conteúdo real em 17/11/2026: redireciona com 301. */
export const Route = createFileRoute("/meio-ambiente/lazer")({
  loader: () => {
    throw redirect({ href: "/temas/lazer-e-passeios", statusCode: 301 });
  },
  component: () => null,
});
