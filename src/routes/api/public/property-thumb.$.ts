import { createFileRoute } from "@tanstack/react-router";

// Entrega as miniaturas WebP (600 px / 1200 px) das fotos principais dos imóveis.
// Só aceita nomes no formato gerado pela rotina de miniaturas.
const NAME = /^[0-9a-f-]{36}-[0-9a-f]{8}-(600|1200)\.webp$/;

export const Route = createFileRoute("/api/public/property-thumb/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const name = (params as { _splat?: string })._splat ?? "";
        if (!NAME.test(name)) return new Response("Not found", { status: 404 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("property-images").download(`thumbs/${name}`);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(data, {
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
