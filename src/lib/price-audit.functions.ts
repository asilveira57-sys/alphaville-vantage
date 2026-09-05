import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractValues, type PriceField } from "./price-audit/extract";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const TIMEOUT_MS = 15_000;
const MAX_BYTES = 4_000_000;
const PAUSE_MS = 500;

export type AuditStatus =
  | "correto"
  | "divergente"
  | "ambiguo"
  | "nao_encontrado"
  | "fonte_indisponivel"
  | "sem_url";

const FIELDS: PriceField[] = ["price_sale", "price_rent", "condo_fee", "iptu"];

async function assertAdmin(context: any) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

function assertSafeUrl(raw: string): string {
  const u = new URL(raw.trim());
  if (!/^https?:$/.test(u.protocol)) throw new Error("Protocolo não permitido.");
  const host = u.hostname.toLowerCase();
  const blocked =
    host === "localhost" || host.endsWith(".localhost") || host === "0.0.0.0" ||
    /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^169\.254\./.test(host) ||
    host.endsWith(".internal") || host.endsWith(".local") || host === "[::1]";
  if (blocked) throw new Error("Endereço interno bloqueado.");
  return u.toString();
}

async function fetchHtml(url: string): Promise<string> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { "user-agent": UA, accept: "text/html", "accept-language": "pt-BR,pt;q=0.9" },
        redirect: "follow",
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      return text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text;
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Falha ao acessar a fonte.");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ *
 * FASE DE ANÁLISE — nunca escreve em public.properties
 * ------------------------------------------------------------------ */
export const auditarValores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string; limit?: number; offset?: number; onlySuspects?: boolean; propertyId?: string }) => ({
    runId: d.runId,
    limit: Math.min(Math.max(d.limit ?? 25, 1), 25),
    offset: Math.max(d.offset ?? 0, 0),
    onlySuspects: !!d.onlySuspects,
    propertyId: d.propertyId ?? null,
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("properties")
      .select("id,slug,title,internal_code,external_ref,source_url,price_sale,price_rent,condo_fee,iptu", { count: "exact" })
      .order("created_at", { ascending: true });

    if (data.propertyId) {
      query = query.eq("id", data.propertyId);
    } else if (data.onlySuspects) {
      query = query.or("price_sale.gt.30000000,price_rent.gt.200000,condo_fee.gt.50000");
    }

    const { data: rows, count, error } = await query.range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Error(error.message);

    const stats = { processed: 0, correto: 0, divergente: 0, ambiguo: 0, erros: 0 };
    const inserts: any[] = [];

    for (const p of rows ?? []) {
      stats.processed++;
      const current: Record<PriceField, number | null> = {
        price_sale: p.price_sale as number | null,
        price_rent: p.price_rent as number | null,
        condo_fee: p.condo_fee as number | null,
        iptu: p.iptu as number | null,
      };

      if (!p.source_url) {
        stats.erros++;
        inserts.push({
          run_id: data.runId, property_id: p.id, source_url: null, field: "price_sale",
          current_value: current.price_sale, status: "sem_url", reason: "Imóvel sem source_url",
        });
        continue;
      }

      let html: string;
      try {
        html = await fetchHtml(assertSafeUrl(p.source_url));
      } catch (e) {
        stats.erros++;
        inserts.push({
          run_id: data.runId, property_id: p.id, source_url: p.source_url, field: "price_sale",
          current_value: current.price_sale, status: "fonte_indisponivel", reason: (e as Error).message,
        });
        await sleep(PAUSE_MS);
        continue;
      }

      const found = extractValues(html);
      for (const field of FIELDS) {
        const f = found[field];
        const cur = current[field];
        let status: AuditStatus;
        let reason: string | null = null;
        let ratio: number | null = null;

        if (!f.raw || !f.parsed) {
          if (cur == null) continue; // nada no banco e nada na fonte: irrelevante
          status = "nao_encontrado";
          reason = "Campo não localizado no anúncio";
        } else if (f.parsed.ambiguo) {
          status = "ambiguo";
          reason = f.parsed.motivo;
          stats.ambiguo++;
        } else {
          const found_value = f.parsed.valor!;
          ratio = found_value > 0 && cur != null ? Math.round(((cur as number) / found_value) * 1000) / 1000 : null;
          if (cur != null && Math.abs((cur as number) - found_value) <= 1) {
            status = "correto";
            stats.correto++;
          } else {
            status = "divergente";
            stats.divergente++;
          }
        }

        inserts.push({
          run_id: data.runId,
          property_id: p.id,
          source_url: p.source_url,
          field,
          current_value: cur,
          found_raw: f.raw,
          found_value: f.parsed && !f.parsed.ambiguo ? f.parsed.valor : null,
          ratio,
          status,
          reason,
        });
      }
      await sleep(PAUSE_MS);
    }

    if (inserts.length) {
      const { error: insErr } = await supabaseAdmin.from("property_price_audit").insert(inserts);
      if (insErr) throw new Error(insErr.message);
    }

    const total = data.propertyId ? (rows?.length ?? 0) : (count ?? 0);
    const nextOffset = data.offset + (rows?.length ?? 0);
    return { stats, total, nextOffset, hasMore: !data.propertyId && nextOffset < total };
  });

/* ------------------------------------------------------------------ *
 * LEITURA DOS RESULTADOS
 * ------------------------------------------------------------------ */
const SORTABLE = ["created_at", "field", "current_value", "found_value", "ratio", "status"] as const;
type SortKey = (typeof SORTABLE)[number];

export const listarAuditoriaValores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      runId?: string | null;
      status?: string | null;
      page?: number;
      pageSize?: number;
      sortBy?: string | null;
      sortDir?: "asc" | "desc" | null;
    }) => ({
      runId: d?.runId ?? null,
      status: d?.status && d.status !== "todos" ? d.status : null,
      page: Math.max(d?.page ?? 1, 1),
      pageSize: [25, 50, 100, 200].includes(d?.pageSize ?? 50) ? (d!.pageSize as number) : 50,
      sortBy: (SORTABLE as readonly string[]).includes(d?.sortBy ?? "") ? (d!.sortBy as SortKey) : ("ratio" as SortKey),
      sortDir: d?.sortDir === "asc" ? ("asc" as const) : ("desc" as const),
    }),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const base = () => {
      let q = supabaseAdmin.from("property_price_audit").select("*", { count: "exact" });
      if (data.runId) q = q.eq("run_id", data.runId);
      const textFields = ["descricao_seo", "seo_description"];
      q = q.not("field", "in", `(${textFields.join(",")})`);
      return q;
    };

    let q = base();
    if (data.status) q = q.eq("status", data.status);
    const from = (data.page - 1) * data.pageSize;
    const { data: rows, count, error } = await q
      .order(data.sortBy, { ascending: data.sortDir === "asc", nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, from + data.pageSize - 1);
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((rows ?? []).map((r) => r.property_id)));
    const props: Record<string, { slug: string; title: string; internal_code: string | null }> = {};
    if (ids.length) {
      const { data: ps } = await supabaseAdmin
        .from("properties")
        .select("id,slug,title,internal_code")
        .in("id", ids);
      for (const p of ps ?? []) props[p.id] = { slug: p.slug, title: p.title, internal_code: p.internal_code };
    }

    return {
      rows: (rows ?? []).map((r) => ({ ...r, property: props[r.property_id] ?? null })),
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
    };
  });

/** Contadores por status + estatísticas separando imóveis × campos. */
export const estatisticasValores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId?: string | null }) => ({ runId: d?.runId ?? null }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const statuses = ["correto", "divergente", "ambiguo", "nao_encontrado", "fonte_indisponivel", "sem_url"];
    const counts: Record<string, number> = {};

    const countFor = async (status?: string) => {
      let q = supabaseAdmin
        .from("property_price_audit")
        .select("id", { count: "exact", head: true })
        .not("field", "in", "(descricao_seo,seo_description)");
      if (data.runId) q = q.eq("run_id", data.runId);
      if (status) q = q.eq("status", status);
      const { count } = await q;
      return count ?? 0;
    };

    counts.todos = await countFor();
    for (const s of statuses) counts[s] = await countFor(s);

    // imóveis analisados e imóveis com pelo menos uma divergência
    const distinct = async (status?: string) => {
      const set = new Set<string>();
      const CHUNK = 1000;
      for (let f = 0; ; f += CHUNK) {
        let q = supabaseAdmin
          .from("property_price_audit")
          .select("property_id")
          .not("field", "in", "(descricao_seo,seo_description)");
        if (data.runId) q = q.eq("run_id", data.runId);
        if (status) q = q.eq("status", status);
        const { data: page } = await q.range(f, f + CHUNK - 1);
        for (const r of page ?? []) set.add(r.property_id);
        if (!page || page.length < CHUNK) break;
      }
      return set.size;
    };

    return {
      counts,
      imoveisAnalisados: await distinct(),
      imoveisComDivergencia: await distinct("divergente"),
      camposVerificados: counts.todos,
    };
  });

/* ------------------------------------------------------------------ *
 * FASE 2 — VALORES CONGELADOS NOS TEXTOS
 * ------------------------------------------------------------------ */
export const auditarTextos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { page?: number; pageSize?: number; filtro?: string | null; persist?: boolean }) => ({
    page: Math.max(d?.page ?? 1, 1),
    pageSize: [25, 50, 100, 200].includes(d?.pageSize ?? 50) ? (d!.pageSize as number) : 50,
    filtro: d?.filtro && d.filtro !== "todos" ? d.filtro : null,
    persist: !!d?.persist,
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { analyzeTexts, fixValuesParagraph } = await import("./price-audit/text-audit");
    type PropRow = import("./price-audit/text-audit").PropRow;


    const all: PropRow[] = [];
    const CHUNK = 1000;
    for (let f = 0; ; f += CHUNK) {
      const { data: page, error } = await supabaseAdmin
        .from("properties")
        .select("id,slug,title,internal_code,price_sale,price_rent,condo_fee,iptu,descricao_seo,seo_description")
        .order("created_at", { ascending: true })
        .range(f, f + CHUNK - 1);
      if (error) throw new Error(error.message);
      all.push(...((page ?? []) as PropRow[]));
      if (!page || page.length < CHUNK) break;
    }

    const analyzed = all.map((p) => {
      const a = analyzeTexts(p);
      const fix = a.status === "texto_desatualizado" ? fixValuesParagraph(p.descricao_seo, p) : null;
      // Trava A3: se o texto DEPOIS é igual ao ANTES, nada mudou -> texto_ok.
      const status =
        a.status === "texto_desatualizado" && fix && fix.before != null && fix.before === (fix.after ?? fix.before)
          ? ("texto_ok" as const)
          : a.status;
      return { p, ...a, status, fix };
    });


    const stats = {
      total: analyzed.length,
      texto_ok: analyzed.filter((a) => a.status === "texto_ok").length,
      texto_desatualizado: analyzed.filter((a) => a.status === "texto_desatualizado").length,
      sem_texto: analyzed.filter((a) => a.status === "sem_texto").length,
    };

    const filtered = data.filtro ? analyzed.filter((a) => a.status === data.filtro) : analyzed;
    const ordered = [...filtered].sort((a, b) => {
      const ra = Math.abs(a.issues[0]?.ratio ?? 0);
      const rb = Math.abs(b.issues[0]?.ratio ?? 0);
      return rb - ra;
    });
    const from = (data.page - 1) * data.pageSize;
    const pageRows = ordered.slice(from, from + data.pageSize);

    if (data.persist) {
      const runId = crypto.randomUUID();
      const inserts = analyzed
        .filter((a) => a.status === "texto_desatualizado")
        .flatMap((a) =>
          a.issues.map((i) => ({
            run_id: runId,
            property_id: a.p.id,
            field: i.text_field,
            current_value: i.current_value,
            found_raw: i.found_raw,
            found_value: i.found_value,
            ratio: i.ratio,
            status: "divergente",
            reason: `Texto desatualizado (${i.label})`,
          })),
        );
      for (let i = 0; i < inserts.length; i += 500) {
        await supabaseAdmin.from("property_price_audit").insert(inserts.slice(i, i + 500));
      }
    }

    return {
      stats,
      total: filtered.length,
      page: data.page,
      pageSize: data.pageSize,
      rows: pageRows.map((a) => ({
        id: a.p.id,
        slug: a.p.slug,
        title: a.p.title,
        internal_code: a.p.internal_code,
        status: a.status,
        issues: a.issues,
        antes: a.fix?.before ?? null,
        depois: a.fix?.after ?? null,
        motivo: a.fix?.reason ?? null,
        aplicavel: !!a.fix?.ok,
      })),
    };
  });

export const corrigirTextosValores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { propertyIds: string[] }) => ({ propertyIds: (d?.propertyIds ?? []).slice(0, 500) }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { fixValuesParagraph } = await import("./price-audit/text-audit");
    const { buildSeoDescription } = await import("./property-seo");

    const results: { id: string; ok: boolean; antes?: string | null; depois?: string | null; motivo?: string }[] = [];
    if (!data.propertyIds.length) return { results, aplicados: 0 };

    const { data: rows, error } = await supabaseAdmin
      .from("properties")
      .select("*")
      .in("id", data.propertyIds);
    if (error) throw new Error(error.message);

    let aplicados = 0;
    for (const p of rows ?? []) {
      const fix = fixValuesParagraph(p.descricao_seo, p as any);
      if (!fix.ok || !fix.text) {
        results.push({ id: p.id, ok: false, motivo: fix.reason ?? "Não aplicável" });
        continue;
      }
      const novaMeta = buildSeoDescription(p as any);
      const { error: upErr } = await supabaseAdmin
        .from("properties")
        .update({
          descricao_seo: fix.text,
          seo_description: novaMeta,
          seo_generated_at: new Date().toISOString(),
        })
        .eq("id", p.id);
      if (upErr) {
        results.push({ id: p.id, ok: false, motivo: upErr.message });
        continue;
      }
      aplicados++;
      results.push({ id: p.id, ok: true, antes: fix.before, depois: fix.after });
      await supabaseAdmin.from("cms_audit_log").insert({
        actor_id: context.userId,
        action: "price.text.fix",
        entity_type: "property",
        entity_id: p.id,
        details: {
          descricao_seo_anterior: p.descricao_seo,
          seo_description_anterior: p.seo_description,
          paragrafo_antes: fix.before,
          paragrafo_depois: fix.after,
        },
      });
    }
    return { results, aplicados };
  });


/* ------------------------------------------------------------------ *
 * REVISÃO MANUAL — edição de valores e painel comparativo
 * ------------------------------------------------------------------ */
const EDITABLE: PriceField[] = ["price_sale", "price_rent", "condo_fee", "iptu"];

/** Painel comparativo: colunas atuais, valores citados nos textos e último resultado da fonte. */
export const detalheValoresImovel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { propertyId: string }) => ({ propertyId: d.propertyId }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { analyzeTexts, fixValuesParagraph } = await import("./price-audit/text-audit");

    const { data: p, error } = await supabaseAdmin
      .from("properties")
      .select(
        "id,slug,title,internal_code,source_url,price_sale,price_rent,condo_fee,iptu,descricao_seo,seo_description",
      )
      .eq("id", data.propertyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) throw new Error("Imóvel não encontrado.");

    const { data: audit } = await supabaseAdmin
      .from("property_price_audit")
      .select("field,found_raw,found_value,status,ratio,created_at")
      .eq("property_id", p.id)
      .not("field", "in", "(descricao_seo,seo_description)")
      .order("created_at", { ascending: false })
      .limit(40);

    const fonte: Record<string, { found_raw: string | null; found_value: number | null; status: string; created_at: string }> = {};
    for (const a of audit ?? []) if (!fonte[a.field]) fonte[a.field] = a as any;

    const texts = analyzeTexts(p as any);
    const fix = fixValuesParagraph(p.descricao_seo, p as any);

    return {
      property: p,
      fonte,
      textos: texts,
      preview: { antes: fix.before, depois: fix.after, aplicavel: fix.ok, motivo: fix.reason ?? null },
    };
  });

/** Grava manualmente um ou mais valores do imóvel, com log de auditoria. */
export const editarValoresImovel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { propertyId: string; values: Partial<Record<PriceField, number | null>> }) => ({
    propertyId: d.propertyId,
    values: Object.fromEntries(
      Object.entries(d.values ?? {}).filter(([k]) => (EDITABLE as string[]).includes(k)),
    ) as Partial<Record<PriceField, number | null>>,
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (!Object.keys(data.values).length) throw new Error("Nenhum valor informado.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: before, error } = await supabaseAdmin
      .from("properties")
      .select("id,price_sale,price_rent,condo_fee,iptu,manual_overrides")
      .eq("id", data.propertyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!before) throw new Error("Imóvel não encontrado.");

    const overrides = {
      ...((before.manual_overrides as Record<string, unknown> | null) ?? {}),
      ...Object.fromEntries(
        Object.entries(data.values).map(([k, v]) => [k, { value: v, at: new Date().toISOString(), by: context.userId }]),
      ),
    };

    const { error: upErr } = await supabaseAdmin
      .from("properties")
      .update({ ...data.values, manual_overrides: overrides as any })
      .eq("id", data.propertyId);
    if (upErr) throw new Error(upErr.message);

    await supabaseAdmin.from("cms_audit_log").insert({
      actor_id: context.userId,
      action: "price.value.manual_edit",
      entity_type: "property",
      entity_id: data.propertyId,
      details: {
        antes: Object.fromEntries(Object.keys(data.values).map((k) => [k, (before as any)[k]])),
        depois: data.values,
      },
    });

    return { ok: true, values: data.values };
  });


export const listarRunsValores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("property_price_audit")
      .select("run_id,created_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    const seen = new Map<string, string>();
    for (const r of data ?? []) if (!seen.has(r.run_id)) seen.set(r.run_id, r.created_at);
    return Array.from(seen.entries()).map(([run_id, created_at]) => ({ run_id, created_at }));
  });
