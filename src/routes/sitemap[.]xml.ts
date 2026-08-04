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
          { path: "/guia-de-ruas", changefreq: "weekly", priority: "0.9" },
          { path: "/guia-de-ruas-alphaville", changefreq: "weekly", priority: "0.85" },
          { path: "/ruas", changefreq: "weekly", priority: "0.85" },
          { path: "/condominios", changefreq: "weekly", priority: "0.8" },
          { path: "/bairros", changefreq: "weekly", priority: "0.8" },
          { path: "/escolas", changefreq: "monthly", priority: "0.7" },
          { path: "/restaurantes", changefreq: "monthly", priority: "0.7" },
          { path: "/empresas", changefreq: "monthly", priority: "0.7" },
          { path: "/mercado-imobiliario", changefreq: "weekly", priority: "0.8" },
          { path: "/historia", changefreq: "monthly", priority: "0.7" },
          { path: "/meio-ambiente", changefreq: "monthly", priority: "0.6" },
          { path: "/investimentos", changefreq: "weekly", priority: "0.8" },
          { path: "/imoveis", changefreq: "daily", priority: "0.9" },
          { path: "/quem-somos", changefreq: "monthly", priority: "0.7" },
          { path: "/como-trabalhamos", changefreq: "monthly", priority: "0.7" },
          { path: "/servicos", changefreq: "monthly", priority: "0.8" },
          { path: "/areas-de-atuacao", changefreq: "monthly", priority: "0.7" },
          { path: "/perguntas-frequentes", changefreq: "monthly", priority: "0.7" },
          { path: "/contato", changefreq: "monthly", priority: "0.8" },
          { path: "/transparencia", changefreq: "yearly", priority: "0.5" },
          { path: "/politica-de-atendimento", changefreq: "yearly", priority: "0.5" },
          { path: "/politica-de-privacidade", changefreq: "yearly", priority: "0.4" },
          { path: "/politica-de-cookies", changefreq: "yearly", priority: "0.4" },
          { path: "/lgpd", changefreq: "yearly", priority: "0.4" },
          { path: "/termos-de-uso", changefreq: "yearly", priority: "0.4" },
          { path: "/aviso-legal", changefreq: "yearly", priority: "0.4" },
          { path: "/mapa-do-site", changefreq: "monthly", priority: "0.5" },
        ];

        // Dynamic: imóveis ativos
        const props = await fetchAllRows<{ slug: string; updated_at: string | null }>((f, t) =>
          supabase.from("properties").select("slug,updated_at").eq("status", "active")
            .order("slug", { ascending: true }).range(f, t),
        );
        for (const p of props) {
          entries.push({ path: `/imoveis/${p.slug}`, lastmod: p.updated_at?.slice(0, 10), changefreq: "weekly", priority: "0.7" });
        }

        // Dynamic: editorial_pages publicadas
        const pages = await fetchAllRows<{ slug: string; content_type: string; updated_at: string | null; robots_index?: boolean }>((f, t) =>
          supabase.from("editorial_pages").select("slug,content_type,updated_at,robots_index").eq("status", "published")
            .order("slug", { ascending: true }).range(f, t),
        );
        for (const e of pages) {
          const base = e.content_type === "condominio" ? "/condominios"
            : e.content_type === "bairro" ? "/bairros"
            : e.content_type === "blog" ? "/blog"
            : e.content_type === "guia" ? "/guia"
            : e.content_type === "empreendimento" ? "/empreendimentos"
            : e.content_type === "parceiro" ? "/parceiros"
            : null;
          if (!base) continue;
          if (e.robots_index === false) continue;
          entries.push({ path: `${base}/${e.slug}`, lastmod: e.updated_at?.slice(0, 10), changefreq: "weekly", priority: "0.7" });
        }

        // Dynamic: guias de ruas publicados
        const streets = await fetchAllRows<{ slug: string; updated_at: string | null }>((f, t) =>
          supabase.from("street_guides").select("slug,updated_at").eq("status", "published")
            .order("slug", { ascending: true }).range(f, t),
        );
        for (const s of streets) {
          entries.push({ path: `/guia-de-ruas-alphaville/${s.slug}`, lastmod: s.updated_at?.slice(0, 10), changefreq: "weekly", priority: "0.75" });
        }

        // Dynamic: streets (novo módulo /ruas)
        const ruas = await fetchAllRows<{ slug: string; updated_at: string | null; robots_index?: boolean }>((f, t) =>
          supabase.from("streets").select("slug,updated_at,robots_index").eq("status", "published").eq("active", true)
            .order("slug", { ascending: true }).range(f, t),
        );
        for (const r of ruas) {
          if (r.robots_index === false) continue;
          entries.push({ path: `/ruas/${r.slug}`, lastmod: r.updated_at?.slice(0, 10), changefreq: "weekly", priority: "0.75" });
        }
        // Parceiros e empreendimentos (páginas fixas)
        for (const p of [
          "/parceiros/mpd",
          "/empreendimentos/andromeda-by-mpd",
          "/empreendimentos/terrah-alphaville",
          "/empreendimentos/flora-alphaville",
          "/empreendimentos/neo-alphaville",
        ]) {
          entries.push({ path: p, changefreq: "weekly", priority: "0.8" });
        }

        // Condomínios cadastrados (módulo próprio)
        const condos = await fetchAllRows<{ slug: string; updated_at: string | null }>((f, t) =>
          supabase.from("condominiums").select("slug,updated_at").eq("status", "published")
            .order("slug", { ascending: true }).range(f, t),
        );
        const seen = new Set(entries.map((e) => e.path));
        for (const c of condos) {
          const path = `/condominios/${c.slug}`;
          if (seen.has(path)) continue;
          seen.add(path);
          entries.push({ path, lastmod: c.updated_at?.slice(0, 10), changefreq: "weekly", priority: "0.7" });
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
            "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
          },
        });
      },
    },
  },
});
