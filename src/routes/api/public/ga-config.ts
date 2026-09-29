import { createFileRoute } from "@tanstack/react-router";

// Expõe apenas o ID de medição do Google Analytics (valor público por natureza —
// aparece no HTML de qualquer site que use GA). Nenhum outro segredo é exposto.
export const Route = createFileRoute("/api/public/ga-config")({
  server: {
    handlers: {
      GET: async () => {
        const id = process.env["GOOGLE_ANALYTICS_MEASUREMENT_ID"] ?? null;
        return Response.json(
          { id },
          {
            headers: {
              "Cache-Control": "public, max-age=300",
              "X-Content-Type-Options": "nosniff",
            },
          },
        );
      },
    },
  },
});
