import { createFileRoute, redirect } from "@tanstack/react-router";

// Índice único de ruas: /guia-de-ruas (20/11/2026). /ruas/ só redireciona.
export const Route = createFileRoute("/ruas/")({
  beforeLoad: () => {
    throw redirect({ href: "/guia-de-ruas", statusCode: 301 });
  },
});
