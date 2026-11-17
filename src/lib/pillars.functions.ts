import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { PILLARS, pillarBySlug } from "./pillars";

/** Posts e guias publicados de um pilar (categoria_editorial = label do pilar) e contagem de todos os pilares. */

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type PillarPost = {
  id: string; slug: string; title: string; excerpt: string | null; content_type: string;
  featured_image: string | null; card_image: string | null; published_at: string | null; updated_at: string | null;
};

async function pillarCounts(sb: ReturnType<typeof publicClient>) {
  const { data, error } = await sb
    .from("editorial_pages")
    .select("categoria_editorial")
    .eq("status", "published")
    .in("content_type", ["blog", "guia"])
    .not("categoria_editorial", "is", null);
  if (error) throw new Error(error.message);
  const counts: Record<string, number> = {};
  for (const r of (data ?? []) as { categoria_editorial: string }[]) counts[r.categoria_editorial] = (counts[r.categoria_editorial] ?? 0) + 1;
  return PILLARS.map((p) => ({ slug: p.slug, label: p.label, count: counts[p.label] ?? 0 }));
}

export const getPillarPage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(60) }).parse(d))
  .handler(async ({ data }) => {
    const pillar = pillarBySlug(data.slug);
    if (!pillar) return null;
    const sb = publicClient();
    const [{ data: rows, error }, all] = await Promise.all([
      sb.from("editorial_pages")
        .select("id,slug,title,excerpt,content_type,featured_image,card_image,published_at,updated_at")
        .eq("status", "published")
        .in("content_type", ["blog", "guia"])
        .eq("categoria_editorial", pillar.label)
        .order("published_at", { ascending: false }),
      pillarCounts(sb),
    ]);
    if (error) throw new Error(error.message);
    return { pillar, posts: (rows ?? []) as unknown as PillarPost[], all };
  });

export const getPillarCounts = createServerFn({ method: "GET" }).handler(async () => pillarCounts(publicClient()));
