import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  if (new URL(request.url).pathname.startsWith("/lovable/")) return next();
  try {
    const match = /^\/imoveis\/([^/]+)\/?$/.exec(new URL(request.url).pathname);
    if (match) {
      const { publicClient } = await import("./lib/property-search.functions");
      const { data: blocked, error } = await publicClient().rpc("property_is_blocked", { p_slug: decodeURIComponent(match[1]) });
      if (error) throw new Error(error.message);
      if (blocked) return new Response('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Imóvel removido — S.A Imóveis Alphaville</title></head><body><main><h1>Imóvel removido</h1><p>Este anúncio foi removido do portal.</p><a href="/imoveis">Voltar ao catálogo</a></main></body></html>', { status: 410, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
    }
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
