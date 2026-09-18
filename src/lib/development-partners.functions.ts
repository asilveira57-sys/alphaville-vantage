import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DevelopmentPartner = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  empreendimento_slugs: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type PartnerEmpreendimento = {
  slug: string;
  title: string;
  excerpt: string | null;
  featured_image: string | null;
};

function publicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  );
}

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

// ---------- PUBLIC ----------

export const getDevelopmentPartner = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row, error } = await sb
      .from("development_partners")
      .select("id,slug,name,logo_url,description,empreendimento_slugs,active,created_at,updated_at")
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row ?? null) as DevelopmentPartner | null;
  });

export const listPartnerEmpreendimentos = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slugs: z.array(z.string()).max(50) }).parse(d))
  .handler(async ({ data }) => {
    if (data.slugs.length === 0) return [] as PartnerEmpreendimento[];
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from("editorial_pages")
      .select("slug,title,excerpt,featured_image")
      .eq("status", "published")
      .eq("content_type", "empreendimento")
      .in("slug", data.slugs);
    if (error) throw new Error(error.message);
    const bySlug = new Map((rows ?? []).map((r) => [r.slug, r]));
    // Mantém a ordem definida pelo admin
    return data.slugs
      .map((s) => bySlug.get(s))
      .filter(Boolean) as PartnerEmpreendimento[];
  });

// ---------- ADMIN ----------

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export const listDevelopmentPartnersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("development_partners")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as DevelopmentPartner[];
  });

export const listEmpreendimentoOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("editorial_pages")
      .select("slug,title,status")
      .eq("content_type", "empreendimento")
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as { slug: string; title: string; status: string }[];
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(80).optional().or(z.literal("")),
  logo_url: z.string().trim().max(500).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  empreendimento_slugs: z.array(z.string().trim().min(1)).max(50).default([]),
  active: z.boolean().default(true),
});

export const upsertDevelopmentPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const slug = data.slug ? slugify(data.slug) : slugify(data.name);
    if (!slug) throw new Error("Informe um nome válido.");
    const payload = {
      name: data.name,
      slug,
      logo_url: data.logo_url || null,
      description: data.description || null,
      empreendimento_slugs: data.empreendimento_slugs,
      active: data.active,
      updated_at: new Date().toISOString(),
    };
    const q = data.id
      ? context.supabase.from("development_partners").update(payload).eq("id", data.id)
      : context.supabase.from("development_partners").insert(payload);
    const { error } = await q;
    if (error) {
      if (error.code === "23505") throw new Error("Já existe um parceiro com esse endereço (slug).");
      throw new Error(error.message);
    }
    return { ok: true, slug } as const;
  });

// Vincula um empreendimento a UMA incorporadora (ou nenhuma, com partnerId null).
// Remove o slug de todas as outras para manter o vínculo exclusivo.
export const assignEmpreendimentoPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        empreendimento_slug: z.string().trim().min(1).max(120),
        partner_id: z.string().uuid().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: partners, error } = await context.supabase
      .from("development_partners")
      .select("id,empreendimento_slugs");
    if (error) throw new Error(error.message);
    const now = new Date().toISOString();
    for (const p of partners ?? []) {
      const slugs = (p.empreendimento_slugs ?? []) as string[];
      const has = slugs.includes(data.empreendimento_slug);
      const isTarget = p.id === data.partner_id;
      if (has && !isTarget) {
        await context.supabase
          .from("development_partners")
          .update({
            empreendimento_slugs: slugs.filter((s) => s !== data.empreendimento_slug),
            updated_at: now,
          })
          .eq("id", p.id);
      } else if (!has && isTarget) {
        await context.supabase
          .from("development_partners")
          .update({ empreendimento_slugs: [...slugs, data.empreendimento_slug], updated_at: now })
          .eq("id", p.id);
      }
    }
    return { ok: true } as const;
  });

export const toggleDevelopmentPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("development_partners")
      .update({ active: data.active, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true } as const;
  });
