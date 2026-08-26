import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PARTNER_AGREEMENT_VERSION } from "@/lib/brand";

/**
 * Área de parceiros.
 *
 * O acesso ao mídia kit é identificado e condicionado a duas coisas:
 * cadastro aprovado pela equipe e aceite do termo de adesão. A Resolução
 * COFECI 458/95 art. 1º só admite anúncio público por quem tem contrato de
 * intermediação, e a responsabilidade pela publicidade é conjunta entre
 * quem anuncia e quem divulga — material aberto na internet transfere esse
 * risco para a imobiliária sem nenhum controle.
 */

export type PartnerStatus = "none" | "pending" | "approved" | "rejected" | "revoked";

export type PartnerProfile = {
  id: string;
  full_name: string;
  company: string | null;
  creci: string;
  phone: string;
  email: string | null;
  status: Exclude<PartnerStatus, "none">;
  agreement_version: string | null;
  agreement_accepted_at: string | null;
  review_notes: string | null;
  created_at: string;
};

export type PartnerAccess = {
  status: PartnerStatus;
  profile: PartnerProfile | null;
  /** Aprovado E com o termo vigente aceito. É o que libera o mídia kit. */
  canAccessKits: boolean;
  agreementOutdated: boolean;
};

type RoleChecker = {
  rpc: (
    fn: "has_role",
    args: { _user_id: string; _role: "admin" | "editor" },
  ) => PromiseLike<{ data: boolean | null }>;
};

async function isStaff(ctx: { supabase: RoleChecker; userId: string }) {
  const [{ data: isAdmin }, { data: isEditor }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "editor" }),
  ]);
  return Boolean(isAdmin || isEditor);
}

async function assertStaff(ctx: { supabase: RoleChecker; userId: string }) {
  if (!(await isStaff(ctx))) throw new Error("Forbidden");
}

// ------------------------------------------------------------- parceiro

/** Situação do parceiro logado. Base de toda a área. */
export const getPartnerAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PartnerAccess> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("partner_profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!data) {
      return { status: "none", profile: null, canAccessKits: false, agreementOutdated: false };
    }

    const profile = data as unknown as PartnerProfile;
    const agreementCurrent = profile.agreement_version === PARTNER_AGREEMENT_VERSION;
    const approved = profile.status === "approved";

    return {
      status: profile.status,
      profile,
      canAccessKits: approved && agreementCurrent,
      agreementOutdated: approved && !agreementCurrent,
    };
  });

const applySchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  creci: z.string().trim().min(3).max(40),
  phone: z.string().trim().min(10).max(40),
  email: z.string().trim().email().max(180).optional().or(z.literal("")),
  acceptAgreement: z.literal(true, {
    message: "É necessário aceitar o termo de adesão para solicitar acesso.",
  }),
});

/** Solicitação de acesso. Entra como pendente; quem aprova é a equipe. */
export const applyAsPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => applySchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const headers = getRequest()?.headers;

    const payload = {
      user_id: context.userId,
      full_name: data.fullName,
      company: data.company || null,
      creci: data.creci,
      phone: data.phone.replace(/\D/g, ""),
      email: data.email || null,
      agreement_version: PARTNER_AGREEMENT_VERSION,
      agreement_accepted_at: new Date().toISOString(),
      agreement_ip:
        headers?.get("cf-connecting-ip") ??
        headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        null,
    };

    const { data: existing } = await supabaseAdmin
      .from("partner_profiles")
      .select("id,status")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (existing) {
      const row = existing as { id: string; status: string };
      // Reenvio atualiza os dados e o aceite; quem foi revogado volta à fila.
      const { error } = await supabaseAdmin
        .from("partner_profiles")
        .update({
          ...payload,
          status: row.status === "approved" ? "approved" : "pending",
        })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
      return { ok: true, status: row.status === "approved" ? "approved" : "pending" };
    }

    const { error } = await supabaseAdmin.from("partner_profiles").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true, status: "pending" };
  });

export type PartnerKitItem = {
  propertyId: string;
  slug: string;
  title: string;
  image: string | null;
  city: string | null;
  neighborhood: string | null;
  condominium_name: string | null;
  price_sale: number | null;
  expiresAt: string | null;
};

/**
 * Imóveis com kit disponível: só os publicados na vitrine e dentro da
 * validade. O material vence junto com a curadoria — kit de imóvel vendido
 * circulando é publicidade enganosa com o nome da imobiliária.
 */
export const listPartnerKits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PartnerKitItem[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("partner_profiles")
      .select("status,agreement_version")
      .eq("user_id", context.userId)
      .maybeSingle();

    const row = profile as { status?: string; agreement_version?: string } | null;
    const partnerOk =
      row?.status === "approved" && row?.agreement_version === PARTNER_AGREEMENT_VERSION;

    if (!partnerOk && !(await isStaff(context))) return [];

    const { data, error } = await supabaseAdmin
      .from("properties")
      .select(
        "id,slug,title,images,city,neighborhood,condominium_name,price_sale,opportunity_expires_at",
      )
      .eq("status", "active")
      .eq("opportunity_status", "published")
      .or(`opportunity_expires_at.is.null,opportunity_expires_at.gt.${new Date().toISOString()}`)
      .order("opportunity_rank", { ascending: true, nullsFirst: false })
      .limit(50);
    if (error) throw new Error(error.message);

    return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => {
      const images = Array.isArray(r["images"]) ? (r["images"] as unknown[]) : [];
      const first = images.find(
        (u): u is string => typeof u === "string" && /^https?:\/\//.test(u),
      );
      return {
        propertyId: String(r["id"]),
        slug: String(r["slug"] ?? ""),
        title: String(r["title"] ?? ""),
        image: first ?? null,
        city: (r["city"] as string) ?? null,
        neighborhood: (r["neighborhood"] as string) ?? null,
        condominium_name: (r["condominium_name"] as string) ?? null,
        price_sale: typeof r["price_sale"] === "number" ? r["price_sale"] : null,
        expiresAt: (r["opportunity_expires_at"] as string) ?? null,
      };
    });
  });

export type MediaKitData = {
  property: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    property_type: string | null;
    purpose: string | null;
    city: string | null;
    state: string | null;
    neighborhood: string | null;
    condominium_name: string | null;
    internal_code: string | null;
    bedrooms: number | null;
    suites: number | null;
    bathrooms: number | null;
    parking: number | null;
    /** Área útil e área total vão separadas por exigência do Anexo D do CONAR. */
    area_useful: number | null;
    area_total: number | null;
    price_sale: number | null;
    price_rent: number | null;
    condo_fee: number | null;
    iptu: number | null;
    images: string[];
    headline: string | null;
    reason: string | null;
    expiresAt: string | null;
  };
  valuation: {
    badge: string;
    deltaPct: number;
    referenceSqmPrice: number;
    sampleSize: number;
    methodLabel: string;
    sourceLabel: string;
    computedAt: string;
  } | null;
};

/** Conteúdo do mídia kit. Só entrega para parceiro aprovado ou staff. */
export const getMediaKit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ context, data }): Promise<MediaKitData | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("partner_profiles")
      .select("id,status,agreement_version")
      .eq("user_id", context.userId)
      .maybeSingle();

    const row = profile as { id: string; status?: string; agreement_version?: string } | null;
    const partnerOk =
      row?.status === "approved" && row?.agreement_version === PARTNER_AGREEMENT_VERSION;
    if (!partnerOk && !(await isStaff(context))) throw new Error("Forbidden");

    const { data: p, error } = await supabaseAdmin
      .from("properties")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "active")
      .eq("opportunity_status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) return null;

    const prop = p as unknown as Record<string, unknown>;
    const expiresAt = (prop["opportunity_expires_at"] as string) ?? null;
    if (expiresAt && Date.parse(expiresAt) < Date.now()) return null;

    const images = Array.isArray(prop["images"])
      ? (prop["images"] as unknown[]).filter(
          (u): u is string =>
            typeof u === "string" &&
            /^https?:\/\//.test(u) &&
            !/(logo|favicon|whats|placeholder|topo_contato)/i.test(u),
        )
      : [];

    const { data: valuationRow } = await supabaseAdmin
      .from("opportunity_valuations")
      .select("*")
      .eq("property_id", String(prop["id"]))
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { badgeText, METHOD_LABEL, QUALIFYING_DELTA_PCT, MIN_SAMPLE } =
      await import("@/lib/opportunity-valuation");

    const v = valuationRow as unknown as Record<string, unknown> | null;
    const delta = v ? Number(v["delta_pct"]) : NaN;
    const sample = v ? Number(v["sample_size"]) : 0;
    const valuation =
      v && Number.isFinite(delta) && delta <= QUALIFYING_DELTA_PCT && sample >= MIN_SAMPLE
        ? {
            badge: badgeText({ delta_pct: delta }),
            deltaPct: delta,
            referenceSqmPrice: Number(v["reference_sqm_price"]),
            sampleSize: sample,
            methodLabel:
              METHOD_LABEL[v["method"] as keyof typeof METHOD_LABEL] ?? "nos comparáveis",
            sourceLabel: String(v["source_label"] ?? ""),
            computedAt: String(v["computed_at"]),
          }
        : null;

    // Registra o acesso: é o que permite avisar quem baixou quando o imóvel sai.
    await supabaseAdmin.from("media_kit_access_log").insert({
      partner_id: row?.id ?? null,
      user_id: context.userId,
      property_id: String(prop["id"]),
      action: "view",
    });

    const numOrNull = (k: string) => (typeof prop[k] === "number" ? (prop[k] as number) : null);
    const strOrNull = (k: string) => (typeof prop[k] === "string" ? (prop[k] as string) : null);

    return {
      property: {
        id: String(prop["id"]),
        slug: String(prop["slug"]),
        title: String(prop["title"] ?? ""),
        description: strOrNull("descricao_seo") ?? strOrNull("description"),
        property_type: strOrNull("property_type"),
        purpose: strOrNull("purpose"),
        city: strOrNull("city"),
        state: strOrNull("state"),
        neighborhood: strOrNull("neighborhood"),
        condominium_name: strOrNull("condominium_name"),
        internal_code: strOrNull("internal_code"),
        bedrooms: numOrNull("bedrooms"),
        suites: numOrNull("suites"),
        bathrooms: numOrNull("bathrooms"),
        parking:
          numOrNull("parking") ??
          ((numOrNull("parking_covered") ?? 0) + (numOrNull("parking_uncovered") ?? 0) || null),
        area_useful: numOrNull("area_useful") ?? numOrNull("area_built"),
        area_total: numOrNull("area_total"),
        price_sale: numOrNull("price_sale"),
        price_rent: numOrNull("price_rent"),
        condo_fee: numOrNull("condo_fee"),
        iptu: numOrNull("iptu"),
        images,
        headline: strOrNull("opportunity_headline"),
        reason: strOrNull("opportunity_reason"),
        expiresAt,
      },
      valuation,
    };
  });

/** Registra impressão e cópia de texto, para o mesmo fim do log de acesso. */
export const logMediaKitAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        propertyId: z.string().uuid(),
        action: z.enum(["print", "copy_text", "copy_images"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("partner_profiles")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();

    await supabaseAdmin.from("media_kit_access_log").insert({
      partner_id: (profile as { id?: string } | null)?.id ?? null,
      user_id: context.userId,
      property_id: data.propertyId,
      action: data.action,
    });
    return { ok: true };
  });

// ---------------------------------------------------------------- admin

export type AdminPartnerRow = PartnerProfile & {
  user_id: string;
  reviewed_at: string | null;
  downloads: number;
};

export const listPartnersForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminPartnerRow[]> => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: partners, error }, { data: logs }] = await Promise.all([
      supabaseAdmin
        .from("partner_profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin.from("media_kit_access_log").select("partner_id").limit(5000),
    ]);
    if (error) throw new Error(error.message);

    const counts = new Map<string, number>();
    for (const l of (logs ?? []) as { partner_id: string | null }[]) {
      if (!l.partner_id) continue;
      counts.set(l.partner_id, (counts.get(l.partner_id) ?? 0) + 1);
    }

    return ((partners ?? []) as unknown as AdminPartnerRow[]).map((p) => ({
      ...p,
      downloads: counts.get(p.id) ?? 0,
    }));
  });

/**
 * Aprova, rejeita ou revoga um parceiro.
 *
 * Aprovar concede a role `parceiro`; qualquer outro estado a remove — o
 * acesso ao material acompanha a decisão, sem passo manual esquecido.
 */
export const reviewPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        partnerId: z.string().uuid(),
        status: z.enum(["approved", "rejected", "revoked", "pending"]),
        notes: z.string().trim().max(400).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: partner, error: readError } = await supabaseAdmin
      .from("partner_profiles")
      .select("user_id")
      .eq("id", data.partnerId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!partner) throw new Error("Parceiro não encontrado.");

    const userId = (partner as { user_id: string }).user_id;

    const { error } = await supabaseAdmin
      .from("partner_profiles")
      .update({
        status: data.status,
        review_notes: data.notes ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.partnerId);
    if (error) throw new Error(error.message);

    if (data.status === "approved") {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "parceiro" }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", "parceiro");
    }

    await supabaseAdmin.from("cms_audit_log").insert({
      actor_id: context.userId,
      action: `partner.${data.status}`,
      entity_type: "partner",
      entity_id: data.partnerId,
      details: { notes: data.notes ?? null },
    });

    return { ok: true };
  });
