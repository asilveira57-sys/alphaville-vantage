import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchAllRows } from "./fetch-all";

type Row = {
  id: string;
  slug: string;
  title: string;
  content_type: string;
  status: string;
  featured_image: string | null;
  meta_title: string | null;
  meta_description: string | null;
  excerpt: string | null;
  html_content: string | null;
  updated_at: string;
};

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

function plainTextLength(html: string | null | undefined) {
  return (html ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

export type PendingItem = {
  id: string;
  slug: string;
  title: string;
  content_type: string;
  status: string;
  chars: number;
  updated_at: string;
  issues: string[];
};

export const listPendingContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const rows = await fetchAllRows<Row>((f, t) =>
      context.supabase
        .from("editorial_pages")
        .select("id,slug,title,content_type,status,featured_image,meta_title,meta_description,excerpt,html_content,updated_at")
        .order("updated_at", { ascending: false })
        .range(f, t),
    );

    const items: PendingItem[] = [];
    for (const r of rows) {
      const chars = plainTextLength(r.html_content);
      const issues: string[] = [];
      if (chars === 0) issues.push("Sem conteúdo");
      else if (chars < 600) issues.push("Texto curto");
      if (!r.featured_image) issues.push("Sem imagem");
      if (!r.excerpt?.trim()) issues.push("Sem resumo");
      if (!r.meta_title?.trim() || !r.meta_description?.trim()) issues.push("SEO incompleto");
      if (issues.length === 0) continue;
      items.push({
        id: r.id,
        slug: r.slug,
        title: r.title,
        content_type: r.content_type,
        status: r.status,
        chars,
        updated_at: r.updated_at,
        issues,
      });
    }

    items.sort((a, b) => a.chars - b.chars || b.issues.length - a.issues.length);

    return {
      items,
      summary: {
        total: items.length,
        empty: items.filter((i) => i.chars === 0).length,
        short: items.filter((i) => i.chars > 0 && i.chars < 600).length,
        noImage: items.filter((i) => i.issues.includes("Sem imagem")).length,
        noSeo: items.filter((i) => i.issues.includes("SEO incompleto")).length,
      },
    };
  });
