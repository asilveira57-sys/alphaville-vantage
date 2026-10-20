import { createFileRoute } from "@tanstack/react-router";

// Entrega as miniaturas WebP (600 px / 1200 px) das fotos principais dos imóveis.
// Só aceita nomes no formato gerado pela rotina de miniaturas.
const NAME = /^[0-9a-f-]{36}-[0-9a-f]{8}-(600|1200)\.webp$/;

// O bucket é privado (a política do workspace bloqueia buckets públicos), então
// a CDN do Storage não pode servir direto. Em vez disso, a resposta fica na
// Cache API do servidor: só o primeiro pedido de cada miniatura baixa do
// Storage; os seguintes saem do cache de borda. No ambiente de desenvolvimento
// a Cache API não existe e cada pedido baixa de novo — comportamento antigo.
function edgeCache(): Cache | null {
  const c = (globalThis as { caches?: { default?: Cache } }).caches;
  return c?.default ?? null;
}

export const Route = createFileRoute("/api/public/property-thumb/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const name = (params as { _splat?: string })._splat ?? "";
        if (!NAME.test(name)) return new Response("Not found", { status: 404 });

        const cache = edgeCache();
        if (cache) {
          const hit = await cache.match(request);
          if (hit) return hit;
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("property-images").download(`thumbs/${name}`);
        if (error || !data) return new Response("Not found", { status: 404 });

        const res = new Response(data, {
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
        if (cache) await cache.put(request, res.clone());
        return res;
      },
    },
  },
});
