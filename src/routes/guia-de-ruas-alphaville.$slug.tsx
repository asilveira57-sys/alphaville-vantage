import { createFileRoute, redirect } from "@tanstack/react-router";

// Módulo antigo (street_guides vazio). As páginas de rua ficam em /ruas/$slug (20/11/2026).
export const Route = createFileRoute("/guia-de-ruas-alphaville/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ href: `/ruas/${params.slug}`, statusCode: 301 });
  },
});
