import { createFileRoute, redirect } from "@tanstack/react-router";

// Módulo antigo (street_guides vazio). Índice único: /guia-de-ruas (20/11/2026).
export const Route = createFileRoute("/guia-de-ruas-alphaville/")({
  beforeLoad: () => {
    throw redirect({ href: "/guia-de-ruas", statusCode: 301 });
  },
});
