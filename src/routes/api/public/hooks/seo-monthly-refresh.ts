import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { submitIndexNow } from "@/lib/indexnow.server";

const SITE_URL = "https://alphaville-vantage.lovable.app";
const SITE_HOST = "alphaville-vantage.lovable.app";

const STATIC_ROUTES = [
  "/", "/blog", "/alphaville", "/guia-alphaville", "/guia-tambore",
  "/guia-barueri", "/guia-santana-de-parnaiba", "/condominios", "/bairros",
  "/escolas", "/restaurantes", "/empresas", "/mercado-imobiliario",
  "/historia", "/meio-ambiente", "/investimentos", "/imoveis",
  "/quem-somos", "/como-trabalhamos", "/servicos", "/areas-de-atuacao",
  "/perguntas-frequentes", "/contato", "/transparencia",
  "/politica-de-atendimento", "/politica-de-privacidade", "/politica-de-cookies",
  "/lgpd", "/termos-de-uso", "/aviso-legal", "/mapa-do-site",
];

// Endpoint mensal chamado pelo pg_cron.
// Autenticado pelo header apikey (anon key) — padrão dos cron jobs do projeto.
export const Route = createFileRoute("/api/public/hooks/seo-monthly-refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }

        const sb = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
        );

        const [props, pages] = await Promise.all([
          sb.from("properties").select("slug").eq("status", "active"),
          sb.from("editorial_pages").select("slug,content_type").eq("status", "published"),
        ]);

        const urls: string[] = [];
        for (const p of STATIC_ROUTES) urls.push(`${SITE_URL}${p}`);
        for (const p of props.data ?? []) urls.push(`${SITE_URL}/imoveis/${p.slug}`);
        for (const e of pages.data ?? []) {
          const base = e.content_type === "condominio" ? "/condominios"
            : e.content_type === "bairro" ? "/bairros"
            : e.content_type === "blog" ? "/blog" : null;
          if (base) urls.push(`${SITE_URL}${base}/${e.slug}`);
        }

        const result = await submitIndexNow(SITE_HOST, urls);
        const now = new Date().toISOString();

        await sb.from("seo_state").update({
          sitemap_purged_at: now,
          indexnow_last_run_at: result.ok ? now : null,
          updated_at: now,
        }).eq("id", true);

        await sb.from("seo_runs").insert({
          kind: "monthly",
          urls_count: result.urlsSent,
          http_status: result.status,
          error: result.error ?? null,
          triggered_by: "cron",
        });

        return Response.json({
          ok: result.ok,
          total_urls: urls.length,
          indexnow_status: result.status,
          error: result.error,
        });
      },
    },
  },
});
