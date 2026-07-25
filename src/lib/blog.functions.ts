import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { generateText } from "ai";
import { sanitizeHtml } from "./sanitize-html";

function publicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  );
}

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

// ---------- PUBLIC ----------

export const listPublishedPosts = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("editorial_pages")
    .select("id, slug, title, excerpt, featured_image, published_at, tags")
    .eq("status", "published")
    .eq("content_type", "blog")
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getPostBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row, error } = await sb
      .from("editorial_pages")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .eq("content_type", "blog")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listRelatedPosts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({
    excludeSlug: z.string(),
    tags: z.array(z.string()).default([]),
    limit: z.number().int().positive().max(6).default(3),
  }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb.from("editorial_pages")
      .select("id, slug, title, excerpt, featured_image, published_at, tags")
      .eq("status", "published")
      .eq("content_type", "blog")
      .neq("slug", data.excludeSlug)
      .order("published_at", { ascending: false })
      .limit(data.limit * 4);
    if (data.tags.length) q = q.overlaps("tags", data.tags);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    // fallback: se não houver por tag, retorna os mais recentes gerais
    if (list.length === 0 && data.tags.length) {
      const { data: fb } = await sb.from("editorial_pages")
        .select("id, slug, title, excerpt, featured_image, published_at, tags")
        .eq("status", "published").eq("content_type", "blog")
        .neq("slug", data.excludeSlug)
        .order("published_at", { ascending: false })
        .limit(data.limit);
      return fb ?? [];
    }
    return list.slice(0, data.limit);
  });

// ---------- AI generation now into editorial_pages ----------

export const generatePostWithAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    topic: z.string().min(5),
    category: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const { data: job } = await context.supabase.from("content_generation_jobs").insert({
      topic: data.topic, category: data.category,
      model: "google/gemini-3-flash-preview", status: "running",
      created_by: context.userId,
    }).select().single();

    try {
      const gateway = createLovableAiGatewayProvider(key);
      const system = `Você é um jornalista editorial especializado em mercado imobiliário de alto padrão de Alphaville, Tamboré, Barueri e Santana de Parnaíba. Escreva em português brasileiro, tom sofisticado, minimalista e factual. Evite hard sell. Use H2/H3, parágrafos curtos. Inclua ao final uma seção "Perguntas frequentes" com 3 a 5 Q&A.

Responda APENAS HTML válido (sem markdown, sem cabeçalho de documento, sem <html> ou <body>). Use apenas: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <blockquote>.`;
      const prompt = `Escreva uma reportagem editorial completa em HTML sobre: "${data.topic}". Categoria: ${data.category ?? "geral"}.
Estrutura: <h1> com o título · 1 parágrafo de lead · 4 a 6 seções <h2> · FAQ final em <h2>Perguntas frequentes</h2> com <h3>pergunta</h3><p>resposta</p>.

Comece pelo <h1>.`;

      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system, prompt,
      });

      const html = sanitizeHtml(text);
      const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const title = (titleMatch?.[1] ?? data.topic).replace(/<[^>]+>/g, "").trim();
      const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const excerpt = plain.slice(0, 240);
      const slug = slugify(title);

      const { data: post, error: postErr } = await context.supabase.from("editorial_pages").insert({
        slug, title, excerpt,
        html_content: html,
        content_type: "blog",
        status: "draft",
        tags: data.category ? [data.category] : [],
        meta_title: title.slice(0, 60),
        meta_description: excerpt.slice(0, 155),
        author_id: context.userId,
      }).select().single();
      if (postErr) throw postErr;

      await context.supabase.from("content_generation_jobs").update({
        status: "success", editorial_page_id: post.id,
        finished_at: new Date().toISOString(),
      }).eq("id", job!.id);

      return { post, jobId: job!.id };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await context.supabase.from("content_generation_jobs").update({
        status: "error", error: msg, finished_at: new Date().toISOString(),
      }).eq("id", job!.id);
      throw new Error(msg);
    }
  });
