import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SITE_URL } from "@/lib/site";

// Propostas do Corretor: o corretor monta uma seleção de até 12 imóveis e envia
// um link /proposta/{token} ao cliente. Tabelas: broker_profiles, proposals,
// proposal_items (supabase/sql/propostas-corretor.sql). Só admins gerenciam;
// a página pública lê pelo servidor com a chave de serviço.

export const PROPOSAL_MAX_ITEMS = 12;
export const PROPOSAL_DAYS = 14;

type Ctx = { supabase: { rpc: (fn: "has_role", a: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: unknown }> }; userId: string };

async function assertAdmin(ctx: unknown) {
  const c = ctx as Ctx;
  const { data } = await c.supabase.rpc("has_role", { _user_id: c.userId, _role: "admin" });
  if (!data) throw new Error("Apenas administradores.");
  return c.userId;
}

async function db(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

function fail(error: { message: string } | null) {
  if (!error) return;
  if (/relation .*(broker_profiles|proposals|proposal_items).* does not exist|Could not find the table/i.test(error.message)) {
    throw new Error("As tabelas das propostas ainda não existem. Rode o SQL supabase/sql/propostas-corretor.sql no editor do Cloud.");
  }
  throw new Error(error.message);
}

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");
export function waNumber(s: string | null | undefined) {
  const d = digits(s);
  if (!d) return "";
  return d.startsWith("55") && d.length >= 12 ? d : `55${d}`;
}

function newToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const proposalUrl = (token: string) => `${SITE_URL}/proposta/${token}`;

export function proposalWhatsappHref(p: { client_phone: string | null; client_name: string; broker_name: string; items: number; token: string }) {
  const text = `Olá ${p.client_name.split(" ")[0]}, aqui é ${p.broker_name}, da S.A Imóveis Alphaville. Separei ${p.items} ${p.items === 1 ? "imóvel" : "imóveis"} para você: ${proposalUrl(p.token)}`;
  const n = waNumber(p.client_phone);
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

// ---------- Corretores ----------

export type BrokerProfile = {
  user_id: string;
  display_name: string;
  photo_url: string | null;
  creci: string | null;
  whatsapp: string | null;
  role_title: string | null;
  tagline: string | null;
  active: boolean;
};

export const listBrokers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = await assertAdmin(context);
    const sb = await db();
    const { data, error } = await sb.from("broker_profiles").select("*").order("display_name");
    fail(error);
    // Equipe (papel admin) para vincular um perfil a um login.
    const { data: roles } = await sb.from("user_roles").select("user_id").eq("role", "admin");
    const team: { userId: string; email: string; name: string | null }[] = [];
    for (const r of (roles ?? []) as { user_id: string }[]) {
      const { data: u } = await sb.auth.admin.getUserById(r.user_id);
      const meta = (u?.user?.user_metadata ?? {}) as Record<string, unknown>;
      team.push({ userId: r.user_id, email: u?.user?.email ?? "", name: (meta.full_name as string) ?? null });
    }
    return { brokers: (data ?? []) as BrokerProfile[], team, me };
  });

export const saveBroker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      user_id: z.string().uuid(),
      display_name: z.string().trim().min(2).max(80),
      creci: z.string().trim().max(30).nullable().optional(),
      whatsapp: z.string().trim().max(20).nullable().optional(),
      role_title: z.string().trim().max(40).nullable().optional(),
      tagline: z.string().trim().max(120).nullable().optional(),
      active: z.boolean().default(true),
      photo_data_url: z.string().max(6_000_000).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const sb = await db();
    let photo_url: string | undefined;
    if (data.photo_data_url) {
      const m = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(data.photo_data_url);
      if (!m) throw new Error("Foto inválida (use JPG, PNG ou WebP).");
      const bin = Uint8Array.from(atob(m[3]), (c) => c.charCodeAt(0));
      const ext = m[2] === "jpeg" ? "jpg" : m[2];
      const path = `${data.user_id}/${Date.now()}.${ext}`;
      const up = await sb.storage.from("broker-photos").upload(path, bin, { contentType: m[1], upsert: true, cacheControl: "31536000" });
      if (up.error) throw new Error(`Falha no envio da foto: ${up.error.message}`);
      photo_url = sb.storage.from("broker-photos").getPublicUrl(path).data.publicUrl;
    }
    const row: Record<string, unknown> = {
      user_id: data.user_id,
      display_name: data.display_name,
      creci: data.creci || null,
      whatsapp: digits(data.whatsapp) || null,
      role_title: data.role_title || "Corretor",
      tagline: data.tagline || null,
      active: data.active,
      updated_at: new Date().toISOString(),
    };
    if (photo_url) row.photo_url = photo_url;
    const { error } = await sb.from("broker_profiles").upsert(row, { onConflict: "user_id" });
    fail(error);
    return { ok: true };
  });

// ---------- Busca de imóveis ----------

export type ProposalPropertyHit = {
  id: string;
  slug: string;
  title: string;
  internal_code: string | null;
  purpose: string | null;
  price_sale: number | null;
  price_rent: number | null;
  bedrooms: number | null;
  parking: number | null;
  area_useful: number | null;
  area_built: number | null;
  area_total: number | null;
  condominium_name: string | null;
  neighborhood: string | null;
  city: string | null;
  card_image_url: string | null;
  large_image_url: string | null;
  property_type: string | null;
  status: string | null;
};

const PROPERTY_COLS =
  "id,slug,title,internal_code,purpose,price_sale,price_rent,bedrooms,parking,area_useful,area_built,area_total,condominium_name,neighborhood,city,card_image_url,large_image_url,property_type,status";

export const searchPropertiesForProposal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      q: z.string().trim().max(80).default(""),
      purpose: z.enum(["all", "sale", "rent"]).default("all"),
      types: z.array(z.string().max(20)).max(10).default([]),
      min: z.number().nonnegative().nullable().optional(),
      max: z.number().nonnegative().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const sb = await db();
    // Coluna de preço conforme a finalidade escolhida.
    const priceCol = data.purpose === "sale" ? "price_sale" : data.purpose === "rent" ? "price_rent" : "listing_price";
    let query = sb.from("properties").select(PROPERTY_COLS).eq("status", "active");
    if (data.purpose === "sale") query = query.in("purpose", ["sale", "both"]);
    if (data.purpose === "rent") query = query.in("purpose", ["rent", "both"]);
    if (data.types.length) query = query.in("property_type", data.types);
    if (data.min) query = query.gte(priceCol, data.min);
    if (data.max) query = query.lte(priceCol, data.max);
    const q = data.q.replace(/[%,()]/g, " ").trim();
    if (q.length >= 2) {
      const code = q.toUpperCase().replace(/\s+/g, "");
      query = query.or(
        [
          `internal_code.ilike.%${code}%`,
          `previous_codes.cs.{${code}}`,
          `condominium_name.ilike.%${q}%`,
          `title.ilike.%${q}%`,
          `neighborhood.ilike.%${q}%`,
        ].join(","),
      );
    }
    const { data: rows, error } = await query.order(priceCol, { ascending: true, nullsFirst: false }).limit(40);
    fail(error);
    return (rows ?? []) as ProposalPropertyHit[];
  });

// ---------- Propostas (admin) ----------

export type ProposalListRow = {
  id: string;
  token: string;
  client_name: string;
  client_phone: string | null;
  broker_user_id: string;
  broker_name: string;
  items: number;
  created_at: string;
  expires_at: string;
  view_count: number;
  last_viewed_at: string | null;
};

export const listProposals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sb = await db();
    const { data, error } = await sb
      .from("proposals")
      .select("id,token,client_name,client_phone,broker_user_id,created_at,expires_at,view_count,last_viewed_at,broker_profiles(display_name),proposal_items(count)")
      .order("created_at", { ascending: false })
      .limit(500);
    fail(error);
    return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      token: r.token as string,
      client_name: r.client_name as string,
      client_phone: (r.client_phone as string) ?? null,
      broker_user_id: r.broker_user_id as string,
      broker_name: ((r.broker_profiles as { display_name?: string } | null)?.display_name) ?? "—",
      items: ((r.proposal_items as { count: number }[] | null)?.[0]?.count) ?? 0,
      created_at: r.created_at as string,
      expires_at: r.expires_at as string,
      view_count: (r.view_count as number) ?? 0,
      last_viewed_at: (r.last_viewed_at as string) ?? null,
    })) as ProposalListRow[];
  });

export type ProposalEdit = {
  id: string | null;
  token: string | null;
  broker_user_id: string;
  client_name: string;
  client_phone: string | null;
  message: string | null;
  expires_at: string | null;
  items: { property: ProposalPropertyHit; broker_note: string | null }[];
};

export const getProposalForEdit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<ProposalEdit> => {
    await assertAdmin(context);
    const sb = await db();
    const { data: p, error } = await sb.from("proposals").select("*").eq("id", data.id).maybeSingle();
    fail(error);
    if (!p) throw new Error("Proposta não encontrada.");
    const { data: items, error: e2 } = await sb
      .from("proposal_items")
      .select(`broker_note,position,properties(${PROPERTY_COLS})`)
      .eq("proposal_id", data.id)
      .order("position");
    fail(e2);
    return {
      id: p.id,
      token: p.token,
      broker_user_id: p.broker_user_id,
      client_name: p.client_name,
      client_phone: p.client_phone,
      message: p.message,
      expires_at: p.expires_at,
      items: ((items ?? []) as Record<string, unknown>[])
        .filter((i) => i.properties)
        .map((i) => ({ property: i.properties as ProposalPropertyHit, broker_note: (i.broker_note as string) ?? null })),
    };
  });

export const saveProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().nullable(),
      broker_user_id: z.string().uuid(),
      client_name: z.string().trim().min(2, "Informe o nome do cliente.").max(120),
      client_phone: z.string().trim().max(20).nullable().optional(),
      message: z.string().trim().max(600).nullable().optional(),
      items: z
        .array(z.object({ property_id: z.string().uuid(), broker_note: z.string().trim().max(140).nullable().optional() }))
        .min(1, "Escolha pelo menos um imóvel.")
        .max(PROPOSAL_MAX_ITEMS, `No máximo ${PROPOSAL_MAX_ITEMS} imóveis.`),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const me = await assertAdmin(context);
    const sb = await db();

    const ids = [...new Set(data.items.map((i) => i.property_id))];
    const { data: props, error: pe } = await sb.from("properties").select("id,price_sale,price_rent,internal_code").in("id", ids);
    fail(pe);
    const byId = new Map(((props ?? []) as { id: string; price_sale: number | null; price_rent: number | null; internal_code: string | null }[]).map((p) => [p.id, p]));

    const base = {
      broker_user_id: data.broker_user_id,
      client_name: data.client_name,
      client_phone: digits(data.client_phone) || null,
      message: data.message || null,
      updated_at: new Date().toISOString(),
    };

    let id = data.id;
    let token: string;
    const isNew = !id;
    if (id) {
      const { data: row, error } = await sb.from("proposals").update(base).eq("id", id).select("token").maybeSingle();
      fail(error);
      if (!row) throw new Error("Proposta não encontrada.");
      token = row.token as string;
      const { error: de } = await sb.from("proposal_items").delete().eq("proposal_id", id);
      fail(de);
    } else {
      token = newToken();
      const expires = new Date(Date.now() + PROPOSAL_DAYS * 86400_000).toISOString();
      const { data: row, error } = await sb
        .from("proposals")
        .insert({ ...base, token, expires_at: expires, created_by: me })
        .select("id")
        .single();
      fail(error);
      id = row!.id as string;
    }

    const seen = new Set<string>();
    const rows = data.items
      .filter((i) => !seen.has(i.property_id) && seen.add(i.property_id) && byId.has(i.property_id))
      .map((i, idx) => ({
        proposal_id: id,
        property_id: i.property_id,
        position: idx,
        broker_note: i.broker_note || null,
        price_sale_at_send: byId.get(i.property_id)?.price_sale ?? null,
        price_rent_at_send: byId.get(i.property_id)?.price_rent ?? null,
      }));
    const { error: ie } = await sb.from("proposal_items").insert(rows);
    fail(ie);

    // Entra no CRM com a origem "proposta" (só na criação).
    if (isNew) {
      const { data: broker } = await sb.from("broker_profiles").select("display_name").eq("user_id", data.broker_user_id).maybeSingle();
      const codes = rows.map((r) => byId.get(r.property_id)?.internal_code).filter(Boolean);
      await sb
        .rpc("upsert_lead", {
          p_created: new Date().toISOString(),
          p_email: null,
          p_id: id,
          p_label: "Proposta do corretor",
          p_name: data.client_name,
          p_page: proposalUrl(token),
          p_payload: { broker_user_id: data.broker_user_id, proposal_id: id, codigos: codes },
          p_phone: digits(data.client_phone) || null,
          p_source: "proposta",
          p_summary: `${rows.length} imóveis · corretor ${(broker?.display_name as string) ?? ""}`.trim(),
          p_table: "proposals",
        })
        .then(({ error }) => {
          if (error) console.error("[propostas] upsert_lead", error.message);
        });
    }

    return { id: id!, token, url: proposalUrl(token) };
  });

export const renewProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const sb = await db();
    const expires = new Date(Date.now() + PROPOSAL_DAYS * 86400_000).toISOString();
    const { error } = await sb.from("proposals").update({ expires_at: expires, updated_at: new Date().toISOString() }).eq("id", data.id);
    fail(error);
    return { expires_at: expires };
  });

export const deleteProposal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const sb = await db();
    const { error } = await sb.from("proposals").delete().eq("id", data.id);
    fail(error);
    return { ok: true };
  });

// ---------- Página pública ----------

export type PublicProposal = {
  expired: boolean;
  client_name: string;
  message: string | null;
  expires_at: string;
  broker: { name: string; photo_url: string | null; creci: string | null; whatsapp: string; role_title: string | null; tagline: string | null };
  items: {
    property: ProposalPropertyHit;
    broker_note: string | null;
    price_changed: boolean;
    available: boolean;
  }[];
};

export const getPublicProposal = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(16).max(64) }).parse(d))
  .handler(async ({ data }): Promise<PublicProposal | null> => {
    const sb = await db();
    const { data: p } = await sb
      .from("proposals")
      .select("id,client_name,message,expires_at,broker_profiles(display_name,photo_url,creci,whatsapp,role_title,tagline)")
      .eq("token", data.token)
      .maybeSingle();
    if (!p) return null;
    const b = (p.broker_profiles ?? {}) as unknown as Record<string, string | null>;
    const expired = new Date(p.expires_at as string).getTime() < Date.now();

    let items: PublicProposal["items"] = [];
    if (!expired) {
      const { data: rows } = await sb
        .from("proposal_items")
        .select(`broker_note,position,price_sale_at_send,price_rent_at_send,properties(${PROPERTY_COLS})`)
        .eq("proposal_id", p.id)
        .order("position");
      items = ((rows ?? []) as Record<string, unknown>[])
        .filter((r) => r.properties)
        .map((r) => {
          const prop = r.properties as ProposalPropertyHit;
          const changed =
            (r.price_sale_at_send != null && Number(r.price_sale_at_send) !== Number(prop.price_sale ?? 0)) ||
            (r.price_rent_at_send != null && Number(r.price_rent_at_send) !== Number(prop.price_rent ?? 0));
          return {
            property: prop,
            broker_note: (r.broker_note as string) ?? null,
            price_changed: changed,
            available: prop.status === "active",
          };
        });
    }

    return {
      expired,
      client_name: p.client_name as string,
      message: (p.message as string) ?? null,
      expires_at: p.expires_at as string,
      broker: {
        name: b.display_name ?? "S.A Imóveis",
        photo_url: b.photo_url ?? null,
        creci: b.creci ?? null,
        whatsapp: waNumber(b.whatsapp) || "5511995515053",
        role_title: b.role_title ?? "Corretor",
        tagline: b.tagline ?? null,
      },
      items,
    };
  });

/** Conta uma abertura da proposta (chamado no navegador do cliente). */
export const registerProposalView = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(16).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const sb = await db();
    const { data: p } = await sb.from("proposals").select("id,view_count,first_viewed_at").eq("token", data.token).maybeSingle();
    if (!p) return { ok: false };
    const now = new Date().toISOString();
    await sb
      .from("proposals")
      .update({ view_count: ((p.view_count as number) ?? 0) + 1, last_viewed_at: now, first_viewed_at: p.first_viewed_at ?? now })
      .eq("id", p.id);
    return { ok: true };
  });
