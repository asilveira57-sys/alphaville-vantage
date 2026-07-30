import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const CTA_TYPES = [
  "comprar_imovel",
  "vender_imovel",
  "alugar_imovel",
  "anunciar_imovel",
  "falar_com_corretor",
  "receber_opcoes",
  "conhecer_condominio",
  "conhecer_regiao",
  "avaliar_imovel",
  "investir",
  "atendimento_geral",
] as const;

export const CTA_TYPE_LABELS: Record<string, string> = {
  comprar_imovel: "Comprar imóvel",
  vender_imovel: "Vender imóvel",
  alugar_imovel: "Alugar imóvel",
  anunciar_imovel: "Anunciar imóvel",
  falar_com_corretor: "Falar com corretor",
  receber_opcoes: "Receber opções",
  conhecer_condominio: "Conhecer um condomínio",
  conhecer_regiao: "Conhecer uma região",
  avaliar_imovel: "Avaliar imóvel",
  investir: "Investir",
  atendimento_geral: "Atendimento geral",
};

export const CTA_CONTENT_TYPES = [
  "blog",
  "artigo",
  "guia",
  "rua",
  "condominio",
  "bairro",
  "parceiro",
  "empreendimento",
  "institucional",
] as const;

export const CTA_VARIANTS = ["dark", "light", "gold"] as const;

export type CtaBlock = {
  id: string;
  internal_name: string;
  title: string;
  description: string | null;
  button_label: string | null;
  button_url: string | null;
  secondary_button_label: string | null;
  secondary_button_url: string | null;
  image_url: string | null;
  icon: string | null;
  cta_type: string;
  variant: string;
  conversion_context: string | null;
  tracking_source: string | null;
  allowed_content_types: string[];
  display_order: number;
  active: boolean;
  updated_at: string;
};

function publicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  );
}

async function assertEditor(ctx: { supabase: any; userId: string }) {
  const [{ data: isAdmin }, { data: isEditor }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "editor" }),
  ]);
  if (!isAdmin && !isEditor) throw new Error("Forbidden");
}

// ---------------- PUBLIC ----------------

export const listActiveCtas = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("cta_blocks")
    .select("*")
    .eq("active", true)
    .order("display_order", { ascending: true })
    .order("internal_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as CtaBlock[];
});

export const listCtaDefaults = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await sb.from("cta_defaults").select("content_type,cta_id");
  if (error) throw new Error(error.message);
  return (data ?? []) as { content_type: string; cta_id: string | null }[];
});

/**
 * Resolve o CTA efetivo de uma página:
 * 1. CTA específico da página → 2. CTA padrão do tipo de conteúdo → 3. CTA geral → 4. nenhum
 */
export const resolveCta = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        ctaId: z.string().uuid().nullable().optional(),
        contentType: z.string().optional(),
        hidden: z.boolean().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    if (data.hidden) return null;
    const sb = publicClient();

    if (data.ctaId) {
      const { data: row } = await sb.from("cta_blocks").select("*").eq("id", data.ctaId).eq("active", true).maybeSingle();
      if (row) return row as CtaBlock;
    }
    if (data.contentType) {
      const { data: def } = await sb.from("cta_defaults").select("cta_id").eq("content_type", data.contentType).maybeSingle();
      if (def?.cta_id) {
        const { data: row } = await sb.from("cta_blocks").select("*").eq("id", def.cta_id).eq("active", true).maybeSingle();
        if (row) return row as CtaBlock;
      }
    }
    const { data: general } = await sb.from("cta_defaults").select("cta_id").eq("content_type", "site").maybeSingle();
    if (general?.cta_id) {
      const { data: row } = await sb.from("cta_blocks").select("*").eq("id", general.cta_id).eq("active", true).maybeSingle();
      if (row) return row as CtaBlock;
    }
    return null;
  });

// ---------------- ADMIN ----------------

export const listCtasForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertEditor(context);
    const { data, error } = await context.supabase
      .from("cta_blocks")
      .select("*")
      .order("display_order", { ascending: true })
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as CtaBlock[];
  });

export const upsertCta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        internal_name: z.string().min(2),
        title: z.string().min(2),
        description: z.string().optional().nullable(),
        button_label: z.string().optional().nullable(),
        button_url: z.string().optional().nullable(),
        secondary_button_label: z.string().optional().nullable(),
        secondary_button_url: z.string().optional().nullable(),
        image_url: z.string().optional().nullable(),
        icon: z.string().optional().nullable(),
        cta_type: z.enum(CTA_TYPES).default("atendimento_geral"),
        variant: z.enum(CTA_VARIANTS).default("dark"),
        conversion_context: z.string().optional().nullable(),
        tracking_source: z.string().optional().nullable(),
        allowed_content_types: z.array(z.string()).default([]),
        display_order: z.number().int().default(0),
        active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertEditor(context);
    const payload = { ...data, created_by: context.userId };
    const { data: row, error } = data.id
      ? await context.supabase.from("cta_blocks").update(payload).eq("id", data.id).select("*").single()
      : await context.supabase.from("cta_blocks").insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    await context.supabase.from("cms_audit_log").insert({
      actor_id: context.userId,
      action: data.id ? "cta.update" : "cta.create",
      entity_type: "cta",
      entity_id: row.id,
      details: { internal_name: data.internal_name },
    });
    return row as CtaBlock;
  });

export const deleteCta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertEditor(context);
    const { error } = await context.supabase.from("cta_blocks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("cms_audit_log").insert({
      actor_id: context.userId,
      action: "cta.delete",
      entity_type: "cta",
      entity_id: data.id,
      details: {},
    });
    return { ok: true };
  });

export const setCtaDefault = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ content_type: z.string().min(1), cta_id: z.string().uuid().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertEditor(context);
    const { error } = await context.supabase
      .from("cta_defaults")
      .upsert({ content_type: data.content_type, cta_id: data.cta_id, updated_at: new Date().toISOString() }, { onConflict: "content_type" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
