import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parsePropertyText, computeReviewStatus } from "./property-parser";
import { auditProperty, type SeoSource } from "./property-seo";

type RawPayload = { html_excerpt?: string; body_excerpt?: string };

/**
 * Reprocessa o parser de um (ou todos) imóveis já coletados, sem refazer scrap.
 * Preserva manual_overrides — campos editados no admin nunca são sobrescritos.
 */
export const reprocessProperties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; all?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let processed = 0;
    let updated = 0;
    const PAGE = 200;

    for (let from = 0; ; from += PAGE) {
      let q = supabaseAdmin
        .from("properties")
        .select("id,title,description,source_url,raw,manual_overrides,descricao_seo,purpose")
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1);
      if (data.id) q = q.eq("id", data.id);

      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      const list = rows ?? [];
      if (!list.length) break;

      for (const row of list) {
        processed++;
        const raw = (row.raw ?? {}) as RawPayload;
        const text = [row.description ?? "", raw.body_excerpt ?? "", raw.html_excerpt ?? ""].join("\n");
        const parsed = parsePropertyText({
          title: row.title,
          description: text,
          url: row.source_url,
        });
        const overrides = (row.manual_overrides ?? {}) as Record<string, unknown>;
        const apply = <T,>(field: string, value: T): T =>
          (overrides[field] !== undefined ? (overrides[field] as T) : value);

        const review_status = computeReviewStatus({
          property_type: parsed.property_type,
          city: parsed.city,
          bedrooms: parsed.bedrooms,
          area_useful: parsed.area_useful,
          area_built: parsed.area_built,
          area_total: parsed.area_total,
          price_sale: parsed.price_sale,
          price_rent: parsed.price_rent,
        });

        const seoSrc: SeoSource = {
          property_type: apply("property_type", parsed.property_type),
          purpose: (row as { purpose?: string | null }).purpose ?? null,
          city: apply("city", parsed.city),
          state: apply("state", parsed.state),
          neighborhood: apply("neighborhood", parsed.neighborhood),
          condominium_name: apply("condominium_name", parsed.condominium_name),
          bedrooms: apply("bedrooms", parsed.bedrooms),
          suites: apply("suites", parsed.suites),
          bathrooms: apply("bathrooms", parsed.bathrooms),
          lavabos: apply("lavabos", parsed.lavabos),
          parking: apply("parking", parsed.parking),
          parking_covered: apply("parking_covered", parsed.parking_covered),
          parking_uncovered: apply("parking_uncovered", parsed.parking_uncovered),
          area_useful: apply("area_useful", parsed.area_useful),
          area_built: apply("area_built", parsed.area_built),
          area_total: apply("area_total", parsed.area_total),
          price_sale: apply("price_sale", parsed.price_sale),
          price_rent: apply("price_rent", parsed.price_rent),
          condo_fee: apply("condo_fee", parsed.condo_fee),
          iptu: apply("iptu", parsed.iptu),
          furnished: apply("furnished", parsed.furnished),
          is_launch: apply("is_launch", parsed.is_launch),
          accepts_exchange: apply("accepts_exchange", parsed.accepts_exchange),
          internal_code: apply("internal_code", parsed.internal_code),
        };
        const audit = auditProperty({ ...seoSrc, descricao_seo: (row as { descricao_seo?: string | null }).descricao_seo ?? null });

        const { description: _ignoreDesc, ...structured } = seoSrc;
        void _ignoreDesc;
        const { error: upErr } = await supabaseAdmin
          .from("properties")
          .update({
            ...structured,
            review_status,
            audit_status: audit.status,
            audit_issues: audit.issues,
            extracted_at: new Date().toISOString(),
          } as never)
          .eq("id", row.id);
        if (!upErr) updated++;
      }

      if (data.id) break;
      if (list.length < PAGE) break;
      if (!data.all) break; // se não pediu all, processa só a primeira página
    }

    return { processed, updated };
  });

/**
 * Salva revisão manual de um imóvel. Os campos enviados ficam em
 * manual_overrides e também são gravados no registro principal.
 */
export const saveManualReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; overrides: Record<string, unknown> }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: current, error: selErr } = await supabaseAdmin
      .from("properties")
      .select("manual_overrides")
      .eq("id", data.id)
      .single();
    if (selErr) throw new Error(selErr.message);

    const merged = {
      ...((current?.manual_overrides ?? {}) as Record<string, unknown>),
      ...data.overrides,
    };

    const update = { ...data.overrides, manual_overrides: merged } as never;
    const { error } = await supabaseAdmin
      .from("properties")
      .update(update)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Estatísticas de auditoria do scrap.
 */
export const getScrapAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const base = () => supabaseAdmin.from("properties").select("*", { count: "exact", head: true });
    const [total, active, complete, incomplete, needsReview, auditOk, auditReview, auditError] = await Promise.all([
      base().then((r) => r.count ?? 0),
      base().eq("status", "active").then((r) => r.count ?? 0),
      base().eq("review_status", "complete").then((r) => r.count ?? 0),
      base().eq("review_status", "incomplete").then((r) => r.count ?? 0),
      base().eq("review_status", "needs_review").then((r) => r.count ?? 0),
      base().eq("audit_status", "ok").then((r) => r.count ?? 0),
      base().eq("audit_status", "review").then((r) => r.count ?? 0),
      base().eq("audit_status", "error").then((r) => r.count ?? 0),
    ]);

    const { data: lastRun } = await supabaseAdmin
      .from("scraper_runs")
      .select("started_at,finished_at,status,error,properties_upserted,pages_crawled")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const qualityPct = total ? Math.round((auditOk / total) * 100) : 0;
    return { total, active, complete, incomplete, needsReview, auditOk, auditReview, auditError, qualityPct, lastRun };
  });

/**
 * Lista imóveis para auditoria com filtros.
 */
export const listAuditProperties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    status?: "ok" | "review" | "error" | "all";
    filter?: "missing_condo" | "missing_city" | "missing_area" | "missing_bedrooms" | "missing_price" | "rent_suspect" | "ratio_off" | null;
    limit?: number;
  }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("properties")
      .select("id,slug,internal_code,title,city,condominium_name,bedrooms,suites,bathrooms,lavabos,parking,parking_covered,parking_uncovered,area_useful,area_built,area_total,price_rent,price_sale,descricao_original,descricao_seo,audit_status,audit_issues")
      .order("audit_status", { ascending: true })
      .limit(data.limit ?? 100);
    if (data.status && data.status !== "all") q = q.eq("audit_status", data.status);
    if (data.filter === "missing_condo") q = q.is("condominium_name", null);
    if (data.filter === "missing_city") q = q.is("city", null);
    if (data.filter === "missing_area") q = q.is("area_useful", null).is("area_built", null).is("area_total", null);
    if (data.filter === "missing_bedrooms") q = q.is("bedrooms", null);
    if (data.filter === "missing_price") q = q.is("price_rent", null).is("price_sale", null);
    if (data.filter === "rent_suspect") q = q.not("price_rent", "is", null).lt("price_rent", 100);
    if (data.filter === "ratio_off") {
      // filtragem fina por razão é feita client-side; aqui só restringe a quem tem ambos
      q = q.not("price_rent", "is", null).not("price_sale", "is", null);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let result = rows ?? [];
    if (data.filter === "ratio_off") {
      result = result.filter((r) => {
        const ratio = (r.price_rent ?? 0) / (r.price_sale ?? 1);
        return ratio < 0.0015 || ratio > 0.02;
      });
    }
    return result;
  });

/**
 * Carrega um imóvel com TODOS os campos necessários para a tela de revisão.
 */
export const getPropertyForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("properties")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });


