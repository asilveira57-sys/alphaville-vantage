import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parsePropertyText, computeReviewStatus } from "./property-parser";

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
        .select("id,title,description,source_url,raw,manual_overrides")
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

        const { error: upErr } = await supabaseAdmin
          .from("properties")
          .update({
            property_type: apply("property_type", parsed.property_type),
            city: apply("city", parsed.city),
            state: apply("state", parsed.state),
            neighborhood: apply("neighborhood", parsed.neighborhood),
            condominium_name: apply("condominium_name", parsed.condominium_name),
            price_rent: apply("price_rent", parsed.price_rent),
            price_sale: apply("price_sale", parsed.price_sale),
            condo_fee: apply("condo_fee", parsed.condo_fee),
            iptu: apply("iptu", parsed.iptu),
            bedrooms: apply("bedrooms", parsed.bedrooms),
            suites: apply("suites", parsed.suites),
            bathrooms: apply("bathrooms", parsed.bathrooms),
            parking: apply("parking", parsed.parking),
            area_useful: apply("area_useful", parsed.area_useful),
            area_built: apply("area_built", parsed.area_built),
            area_total: apply("area_total", parsed.area_total),
            furnished: apply("furnished", parsed.furnished),
            is_launch: apply("is_launch", parsed.is_launch),
            accepts_exchange: apply("accepts_exchange", parsed.accepts_exchange),
            internal_code: apply("internal_code", parsed.internal_code),
            review_status,
            extracted_at: new Date().toISOString(),
          })
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
    const [total, active, complete, incomplete, needsReview] = await Promise.all([
      base().then((r) => r.count ?? 0),
      base().eq("status", "active").then((r) => r.count ?? 0),
      base().eq("review_status", "complete").then((r) => r.count ?? 0),
      base().eq("review_status", "incomplete").then((r) => r.count ?? 0),
      base().eq("review_status", "needs_review").then((r) => r.count ?? 0),
    ]);

    const { data: lastRun } = await supabaseAdmin
      .from("scraper_runs")
      .select("started_at,finished_at,status,error,properties_upserted,pages_crawled")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return { total, active, complete, incomplete, needsReview, lastRun };
  });
