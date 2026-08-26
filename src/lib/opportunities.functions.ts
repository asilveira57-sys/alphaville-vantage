import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Vitrine de Oportunidades.
 *
 * Regra que sustenta o módulo: todo selo exibido ao público é derivado de um
 * dado do sistema, com data. Nada aqui aceita texto livre com alegação de
 * preço — o CDC art. 38 põe o ônus da prova em quem anuncia, e o CONAR
 * art. 27 §3º exige documento do preço anterior para alegar redução.
 *
 * O único campo redacional é `opportunity_headline`, a leitura da equipe,
 * validada no servidor contra vocabulário de alegação de preço.
 */

/** Teto de imóveis publicados ao mesmo tempo. Vitrine sem teto deixa de ser curadoria. */
export const SHOWCASE_MAX_PUBLISHED = 8;

/** Quantos cards a home mostra acima da dobra. */
export const HOME_SHOWCASE_SIZE = 3;

export type OpportunitySignal =
  | { kind: "price_drop"; amount: number; observedAt: string }
  | { kind: "new"; publishedAt: string };

export type OpportunityDTO = {
  id: string;
  slug: string;
  title: string;
  headline: string | null;
  image: string | null;
  purpose: string | null;
  property_type: string | null;
  city: string | null;
  neighborhood: string | null;
  region: string | null;
  condominium_name: string | null;
  internal_code: string | null;
  bedrooms: number | null;
  parking: number | null;
  area: number | null;
  price_sale: number | null;
  price_rent: number | null;
  sqm_price: number | null;
  published_at: string | null;
  signals: OpportunitySignal[];
};

const SELECT =
  "id,slug,title,images,purpose,property_type,city,neighborhood,region,condominium_name," +
  "internal_code,bedrooms,parking,parking_covered,parking_uncovered,area_useful,area_built," +
  "area_total,price_sale,price_rent,opportunity_headline,opportunity_reason," +
  "opportunity_rank,opportunity_published_at,opportunity_expires_at,opportunity_status,status";

type Row = Record<string, unknown>;

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

const isUsableImg = (u: string) =>
  /^https?:\/\//.test(u) && !/(logo|favicon|whats|placeholder|topo_contato)/i.test(u);

function firstImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  for (const item of images) {
    if (typeof item === "string" && isUsableImg(item)) return item;
    if (item && typeof item === "object") {
      const url = (item as { url?: unknown }).url;
      if (typeof url === "string" && isUsableImg(url)) return url;
    }
  }
  return null;
}

function toDTO(r: Row, signals: OpportunitySignal[]): OpportunityDTO {
  const parking =
    num(r["parking"]) ??
    ((num(r["parking_covered"]) ?? 0) + (num(r["parking_uncovered"]) ?? 0) || null);
  const area = num(r["area_useful"]) ?? num(r["area_built"]) ?? num(r["area_total"]);
  const priceSale = num(r["price_sale"]);
  return {
    id: String(r["id"]),
    slug: String(r["slug"] ?? ""),
    title: String(r["title"] ?? ""),
    headline: str(r["opportunity_headline"]),
    image: firstImage(r["images"]),
    purpose: str(r["purpose"]),
    property_type: str(r["property_type"]),
    city: str(r["city"]),
    neighborhood: str(r["neighborhood"]),
    region: str(r["region"]),
    condominium_name: str(r["condominium_name"]),
    internal_code: str(r["internal_code"]),
    bedrooms: num(r["bedrooms"]),
    parking,
    area,
    price_sale: priceSale,
    price_rent: num(r["price_rent"]),
    sqm_price: priceSale != null && area != null && area > 0 ? Math.round(priceSale / area) : null,
    published_at: str(r["opportunity_published_at"]),
    signals,
  };
}

/** Uma queda de preço só vira selo se for recente o bastante para ser notícia. */
const PRICE_DROP_WINDOW_DAYS = 90;
/** Ruído de arredondamento do scraper não é redução de preço. */
const PRICE_DROP_MIN_AMOUNT = 1000;

type HistoryRow = { property_id: string; price_sale: number | null; observed_at: string };

/**
 * Deriva os sinais a partir do histórico de preço. Nada aqui é digitado por
 * pessoa: a mensagem flutuante existe porque o dado existe.
 */
async function buildSignals(
  sb: ReturnType<typeof publicClient>,
  rows: Row[],
): Promise<Map<string, OpportunitySignal[]>> {
  const byProperty = new Map<string, OpportunitySignal[]>();
  const ids = rows.map((r) => String(r["id"])).filter(Boolean);
  if (!ids.length) return byProperty;

  const since = new Date(Date.now() - PRICE_DROP_WINDOW_DAYS * 86_400_000).toISOString();
  const { data } = await sb
    .from("property_price_history")
    .select("property_id,price_sale,observed_at")
    .in("property_id", ids)
    .order("observed_at", { ascending: true });

  const history = new Map<string, HistoryRow[]>();
  for (const row of (data ?? []) as HistoryRow[]) {
    const list = history.get(row.property_id) ?? [];
    list.push(row);
    history.set(row.property_id, list);
  }

  for (const row of rows) {
    const id = String(row["id"]);
    const entries = history.get(id) ?? [];
    const signals: OpportunitySignal[] = [];

    // Maior queda registrada na janela, comparando cada ponto com o anterior.
    let best: { amount: number; observedAt: string } | null = null;
    for (let i = 1; i < entries.length; i += 1) {
      const previous = entries[i - 1]!;
      const current = entries[i]!;
      if (current.observed_at < since) continue;
      if (previous.price_sale == null || current.price_sale == null) continue;
      const amount = previous.price_sale - current.price_sale;
      if (amount < PRICE_DROP_MIN_AMOUNT) continue;
      if (!best || amount > best.amount) best = { amount, observedAt: current.observed_at };
    }
    if (best)
      signals.push({ kind: "price_drop", amount: best.amount, observedAt: best.observedAt });

    const publishedAt = str(row["opportunity_published_at"]);
    if (publishedAt && Date.now() - Date.parse(publishedAt) < 7 * 86_400_000) {
      signals.push({ kind: "new", publishedAt });
    }

    byProperty.set(id, signals);
  }

  return byProperty;
}

function activeOpportunityQuery(sb: ReturnType<typeof publicClient>) {
  return sb
    .from("properties")
    .select(SELECT)
    .eq("status", "active")
    .eq("opportunity_status", "published")
    .or(`opportunity_expires_at.is.null,opportunity_expires_at.gt.${new Date().toISOString()}`)
    .order("opportunity_rank", { ascending: true, nullsFirst: false })
    .order("opportunity_published_at", { ascending: false, nullsFirst: false });
}

// ------------------------------------------------------------------ público

/** Vitrine da home: os primeiros da curadoria, prontos para render. */
export const listShowcase = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(12).default(HOME_SHOWCASE_SIZE) }).parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<OpportunityDTO[]> => {
    const sb = publicClient();
    const { data: rows, error } = await activeOpportunityQuery(sb).limit(data.limit);
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as unknown as Row[];
    const signals = await buildSignals(sb, list);
    return list.map((r) => toDTO(r, signals.get(String(r["id"])) ?? []));
  });

const hubSchema = z.object({
  purpose: z.string().optional(),
  type: z.string().optional(),
  city: z.string().optional(),
});

/** Hub /oportunidades: a curadoria inteira, com filtros leves. */
export const listOpportunities = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => hubSchema.parse(d ?? {}))
  .handler(
    async ({
      data,
    }): Promise<{ items: OpportunityDTO[]; total: number; updatedAt: string | null }> => {
      const sb = publicClient();
      const { data: rows, error } = await activeOpportunityQuery(sb).limit(
        SHOWCASE_MAX_PUBLISHED * 4,
      );
      if (error) throw new Error(error.message);

      const all = (rows ?? []) as unknown as Row[];
      const signals = await buildSignals(sb, all);
      let items = all.map((r) => toDTO(r, signals.get(String(r["id"])) ?? []));

      const eq = (a: string | null, b?: string) =>
        !b || (a ?? "").toLowerCase() === b.toLowerCase();
      items = items.filter(
        (i) =>
          eq(i.purpose, data.purpose) && eq(i.property_type, data.type) && eq(i.city, data.city),
      );

      const updatedAt =
        all
          .map((r) => str(r["opportunity_published_at"]))
          .filter((v): v is string => Boolean(v))
          .sort()
          .at(-1) ?? null;

      return { items, total: items.length, updatedAt };
    },
  );

/** Bloco de oportunidade na ficha do imóvel. Retorna null quando não é uma. */
export const getOpportunityForProperty = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<OpportunityDTO | null> => {
    const sb = publicClient();
    const { data: row, error } = await sb
      .from("properties")
      .select(SELECT)
      .eq("slug", data.slug)
      .eq("status", "active")
      .eq("opportunity_status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const typed = row as unknown as Row;
    const expires = str(typed["opportunity_expires_at"]);
    if (expires && Date.parse(expires) < Date.now()) return null;

    const signals = await buildSignals(sb, [typed]);
    return toDTO(typed, signals.get(String(typed["id"])) ?? []);
  });

// -------------------------------------------------------------------- admin

type RoleChecker = {
  rpc: (
    fn: "has_role",
    args: { _user_id: string; _role: "admin" | "editor" },
  ) => PromiseLike<{ data: boolean | null }>;
};

async function assertEditor(ctx: { supabase: RoleChecker; userId: string }) {
  const [{ data: isAdmin }, { data: isEditor }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "editor" }),
  ]);
  if (!isAdmin && !isEditor) throw new Error("Forbidden");
}

/**
 * Vocabulário barrado na leitura da equipe. Alegação de preço é gerada pelo
 * sistema, com número e data — nunca digitada num campo livre.
 */
const PRICE_CLAIM_PATTERNS = [
  /abaixo\s+d[oa]\s+(pre[çc]o|mercado|m[ée]dia|tabela)/i,
  /menor\s+pre[çc]o/i,
  /pre[çc]o\s+(mais\s+baixo|imperd[ií]vel|de\s+banana)/i,
  /[úu]ltima\s+unidade/i,
  /quase\s+vendido/i,
  /vende\s+r[áa]pido/i,
  /\b\d{1,3}\s*%\s*(off|de\s+desconto|abaixo)/i,
  /oportunidade\s+[úu]nica/i,
];

function assertNoPriceClaim(headline: string | null | undefined) {
  if (!headline) return;
  const hit = PRICE_CLAIM_PATTERNS.find((re) => re.test(headline));
  if (hit) {
    throw new Error(
      "A leitura da equipe não pode conter alegação de preço ou escassez. " +
        "Esses selos são gerados pelo sistema, com número e data. " +
        "Descreva o imóvel e o motivo da seleção.",
    );
  }
}

export type AdminOpportunityRow = {
  id: string;
  slug: string;
  title: string;
  city: string | null;
  neighborhood: string | null;
  condominium_name: string | null;
  internal_code: string | null;
  price_sale: number | null;
  area: number | null;
  sqm_price: number | null;
  opportunity_status: string;
  opportunity_rank: number | null;
  opportunity_headline: string | null;
  opportunity_reason: string | null;
  opportunity_published_at: string | null;
  opportunity_expires_at: string | null;
};

function toAdminRow(r: Row): AdminOpportunityRow {
  const area = num(r["area_useful"]) ?? num(r["area_built"]) ?? num(r["area_total"]);
  const priceSale = num(r["price_sale"]);
  return {
    id: String(r["id"]),
    slug: String(r["slug"] ?? ""),
    title: String(r["title"] ?? ""),
    city: str(r["city"]),
    neighborhood: str(r["neighborhood"]),
    condominium_name: str(r["condominium_name"]),
    internal_code: str(r["internal_code"]),
    price_sale: priceSale,
    area,
    sqm_price: priceSale != null && area != null && area > 0 ? Math.round(priceSale / area) : null,
    opportunity_status: String(r["opportunity_status"] ?? "none"),
    opportunity_rank: num(r["opportunity_rank"]),
    opportunity_headline: str(r["opportunity_headline"]),
    opportunity_reason: str(r["opportunity_reason"]),
    opportunity_published_at: str(r["opportunity_published_at"]),
    opportunity_expires_at: str(r["opportunity_expires_at"]),
  };
}

/** Imóveis já vinculados à vitrine, em qualquer estado. */
export const listOpportunitiesForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOpportunityRow[]> => {
    await assertEditor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("properties")
      .select(SELECT)
      .neq("opportunity_status", "none")
      .order("opportunity_rank", { ascending: true, nullsFirst: false })
      .order("opportunity_published_at", { ascending: false, nullsFirst: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as Row[]).map(toAdminRow);
  });

/** Busca no acervo para vincular um imóvel à vitrine. */
export const searchPropertiesForOpportunity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().trim().min(2).max(120) }).parse(d))
  .handler(async ({ context, data }): Promise<AdminOpportunityRow[]> => {
    await assertEditor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const term = `%${data.q}%`;
    const { data: rows, error } = await supabaseAdmin
      .from("properties")
      .select(SELECT)
      .eq("status", "active")
      .or(
        `title.ilike.${term},internal_code.ilike.${term},condominium_name.ilike.${term},neighborhood.ilike.${term}`,
      )
      .limit(30);
    if (error) throw new Error(error.message);
    return ((rows ?? []) as unknown as Row[]).map(toAdminRow);
  });

export type SaveOpportunityInput = z.infer<typeof saveSchema>;

const saveSchema = z.object({
  propertyId: z.string().uuid(),
  status: z.enum(["none", "draft", "published", "paused", "closed"]),
  rank: z.number().int().min(1).max(99).nullable().optional(),
  headline: z.string().trim().max(180).nullable().optional(),
  reason: z.string().trim().max(600).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

/** Vincula, edita ou remove um imóvel da vitrine. */
export const saveOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertEditor(context);
    assertNoPriceClaim(data.headline);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.status === "published") {
      const { count } = await supabaseAdmin
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("opportunity_status", "published")
        .neq("id", data.propertyId);
      if ((count ?? 0) >= SHOWCASE_MAX_PUBLISHED) {
        throw new Error(
          `A vitrine já tem ${SHOWCASE_MAX_PUBLISHED} imóveis publicados. ` +
            "Pause ou encerre um antes de publicar outro.",
        );
      }
    }

    const { data: current } = await supabaseAdmin
      .from("properties")
      .select("opportunity_status,opportunity_published_at")
      .eq("id", data.propertyId)
      .maybeSingle();

    const wasPublished = (current as unknown as Row | null)?.["opportunity_status"] === "published";
    const publishedAt =
      data.status === "published"
        ? ((wasPublished
            ? str((current as unknown as Row | null)?.["opportunity_published_at"])
            : null) ?? new Date().toISOString())
        : str((current as unknown as Row | null)?.["opportunity_published_at"]);

    const { error } = await supabaseAdmin
      .from("properties")
      .update({
        opportunity_status: data.status,
        opportunity_rank: data.rank ?? null,
        opportunity_headline: data.headline ?? null,
        opportunity_reason: data.reason ?? null,
        opportunity_expires_at: data.expiresAt ?? null,
        opportunity_published_at: publishedAt,
      })
      .eq("id", data.propertyId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("cms_audit_log").insert({
      actor_id: context.userId,
      action: data.status === "none" ? "opportunity.remove" : "opportunity.upsert",
      entity_type: "opportunity",
      entity_id: data.propertyId,
      details: {
        status: data.status,
        rank: data.rank ?? null,
        expires_at: data.expiresAt ?? null,
      },
    });

    // Avisa os buscadores: a vitrine e a ficha mudaram.
    try {
      const { autoNotifyPublish } = await import("@/lib/seo.functions");
      await autoNotifyPublish(["/oportunidades"]);
    } catch {
      // IndexNow é best-effort — nunca derruba a publicação.
    }

    return { ok: true };
  });
