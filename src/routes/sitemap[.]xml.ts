import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://alphaville-vantage.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/blog", changefreq: "daily", priority: "0.9" },
          { path: "/alphaville", changefreq: "weekly", priority: "0.9" },
          { path: "/guia-alphaville", changefreq: "weekly", priority: "0.9" },
          { path: "/guia-tambore", changefreq: "weekly", priority: "0.8" },
          { path: "/guia-barueri", changefreq: "weekly", priority: "0.8" },
          { path: "/guia-santana-de-parnaiba", changefreq: "weekly", priority: "0.8" },
          { path: "/condominios", changefreq: "weekly", priority: "0.8" },
          { path: "/escolas", changefreq: "monthly", priority: "0.7" },
          { path: "/restaurantes", changefreq: "monthly", priority: "0.7" },
          { path: "/empresas", changefreq: "monthly", priority: "0.7" },
          { path: "/mercado-imobiliario", changefreq: "weekly", priority: "0.8" },
          { path: "/historia", changefreq: "monthly", priority: "0.7" },
          { path: "/meio-ambiente", changefreq: "monthly", priority: "0.6" },
          { path: "/investimentos", changefreq: "weekly", priority: "0.8" },
          { path: "/imoveis", changefreq: "daily", priority: "0.9" },
        ];

        // Dynamic: imóveis ativos
        const { data: props } = await supabase
          .from("properties")
          .select("slug,updated_at")
          .eq("status", "active");
        for (const p of props ?? []) {
          entries.push({ path: `/imoveis/${p.slug}`, lastmod: p.updated_at?.slice(0, 10), changefreq: "weekly", priority: "0.7" });
        }

        // Dynamic: condomínios publicados
        const { data: condos } = await supabase
          .from("condominiums")
          .select("slug,updated_at")
          .eq("status", "active");
        for (const c of condos ?? []) {
          entries.push({ path: `/condominio/${c.slug}`, lastmod: c.updated_at?.slice(0, 10), changefreq: "weekly", priority: "0.7" });
        }


        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
