import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { generateText } from "ai";

function publicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  );
}

export const listPublishedPosts = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("blog_posts")
    .select("id, slug, title, excerpt, category, cover_image_url, published_at, tags")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getPostBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row, error } = await sb
      .from("blog_posts")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export const listAllPostsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("blog_posts")
      .select("id, slug, title, status, source, category, published_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(3),
    slug: z.string().optional(),
    excerpt: z.string().optional(),
    content_markdown: z.string().default(""),
    category: z.string().optional(),
    status: z.enum(["draft", "review", "published"]).default("draft"),
    meta_title: z.string().optional(),
    meta_description: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const slug = data.slug || slugify(data.title);
    const payload = {
      ...data,
      slug,
      author_id: context.userId,
      published_at: data.status === "published" ? new Date().toISOString() : null,
    };
    const { data: row, error } = await context.supabase
      .from("blog_posts")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

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
      const system = `Você é um jornalista editorial especializado em mercado imobiliário de alto padrão de Alphaville, Tamboré, Barueri e Santana de Parnaíba. Escreva em português brasileiro, tom sofisticado, minimalista e factual. Evite hard sell. Use H2/H3 em markdown, parágrafos curtos. Inclua ao final uma seção "## Perguntas frequentes" com 3 a 5 Q&A.`;
      const prompt = `Escreva uma reportagem editorial completa sobre: "${data.topic}". Categoria: ${data.category ?? "geral"}.
Estrutura:
- Título H1 (uma linha, sem prefixo).
- Linha em branco.
- Lead (1 parágrafo de abertura).
- 4 a 6 seções H2.
- FAQ ao final.

Responda APENAS o markdown, começando pelo H1.`;

      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system, prompt,
      });

      const lines = text.trim().split("\n");
      const titleLine = lines.find((l) => l.startsWith("# ")) ?? `# ${data.topic}`;
      const title = titleLine.replace(/^#\s+/, "").trim();
      const body = text.replace(titleLine, "").trim();
      const excerpt = body.split("\n").find((l) => l.trim() && !l.startsWith("#"))?.slice(0, 240) ?? "";
      const slug = slugify(title);

      const { data: post, error: postErr } = await context.supabase.from("blog_posts").insert({
        slug, title, excerpt,
        content_markdown: text,
        category: data.category,
        status: "review",
        source: "ai",
        meta_title: title.slice(0, 60),
        meta_description: excerpt.slice(0, 155),
        author_id: context.userId,
      }).select().single();
      if (postErr) throw postErr;

      await context.supabase.from("content_generation_jobs").update({
        status: "success", blog_post_id: post.id,
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
