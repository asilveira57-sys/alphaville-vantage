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
export const listarAuditoriaValores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId?: string | null; status?: string | null }) => ({
    runId: d?.runId ?? null,
    status: d?.status && d.status !== "todos" ? d.status : null,
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("property_price_audit")
      .select("*")
      .order("created_at", { ascending: false });
    if (data.runId) q = q.eq("run_id", data.runId);
    if (data.status) q = q.eq("status", data.status);

    const all: any[] = [];
    const CHUNK = 1000;
    for (let from = 0; ; from += CHUNK) {
      const { data: page, error } = await q.range(from, from + CHUNK - 1);
      if (error) throw new Error(error.message);
      all.push(...(page ?? []));
      if (!page || page.length < CHUNK) break;
    }

    const ids = Array.from(new Set(all.map((r) => r.property_id)));
    const props: Record<string, { slug: string; title: string; internal_code: string | null }> = {};
    for (let i = 0; i < ids.length; i += 200) {
      const { data: ps } = await supabaseAdmin
        .from("properties")
        .select("id,slug,title,internal_code")
        .in("id", ids.slice(i, i + 200));
      for (const p of ps ?? []) props[p.id] = { slug: p.slug, title: p.title, internal_code: p.internal_code };
    }

    return all.map((r) => ({ ...r, property: props[r.property_id] ?? null }));
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
