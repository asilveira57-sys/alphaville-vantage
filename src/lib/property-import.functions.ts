import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pickParser } from "./importers/registry";
import type { RawListing } from "./importers/types";
import {
  norm, normStreet, similarity, slugify, titleCase, stateForConfidence, type MatchState,
} from "./importers/normalize";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 20_000;
const MAX_BYTES = 4_000_000;

/* ------------------------------------------------------------------ *
 * Segurança do scraper (SSRF)
 * ------------------------------------------------------------------ */
function assertSafeUrl(raw: string): URL {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { throw new Error("URL inválida."); }
  if (!/^https?:$/.test(u.protocol)) throw new Error("Somente endereços http:// ou https:// são aceitos.");
  const host = u.hostname.toLowerCase();
  const blocked =
    host === "localhost" || host.endsWith(".localhost") || host === "0.0.0.0" ||
    /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^169\.254\./.test(host) ||
    host.endsWith(".internal") || host.endsWith(".local") || host === "[::1]";
  if (blocked) throw new Error("Endereço interno bloqueado por segurança.");
  return u;
}

async function fetchPage(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml",
        "accept-language": "pt-BR,pt;q=0.9",
      },
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Não foi possível acessar este anúncio (HTTP ${res.status}).`);
    const text = await res.text();
    if (text.length > MAX_BYTES) return text.slice(0, MAX_BYTES);
    return text;
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error("O site demorou demais para responder.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ *
 * Tipos do rascunho de importação
 * ------------------------------------------------------------------ */
export type MatchOption = { id: string | null; label: string; confidence: number };
export type FieldMatch = {
  text: string | null;
  id: string | null;
  label: string | null;
  confidence: number;
  state: MatchState;
  options: MatchOption[];
};

export type ImportDraft = {
  identification: {
    purpose: string | null;
    property_type: string | null;
    title: string | null;
    external_code: string | null;
    internal_code: string | null;
  };
  location: {
    postal_code: string | null;
    state: string | null;
    number: string | null;
    complement: string | null;
  };
  prices: { price_sale: number | null; price_rent: number | null; condo_fee: number | null; iptu: number | null };
  characteristics: {
    area_total: number | null; area_built: number | null; area_useful: number | null; area_land: number | null;
    bedrooms: number | null; suites: number | null; bathrooms: number | null; lavabos: number | null;
    parking: number | null; parking_covered: number | null; parking_uncovered: number | null;
    features: string[]; condo_features: string[]; unknown_features: string[];
  };
  description: { text: string | null; html: string | null };
  images: string[];
  cover_index: number;
  matches: { city: FieldMatch; neighborhood: FieldMatch; street: FieldMatch; condominium: FieldMatch };
  source: { url: string; parser: string; label: string; imported_at: string; external_code: string | null };
  seo: RawListing["seo"];
};

const PROPERTY_TYPES = [
  "Casa", "Apartamento", "Terreno", "Comercial", "Sala", "Galpão", "Sobrado",
  "Cobertura", "Flat", "Studio", "Loja", "Prédio", "Chácara", "Área", "Outros",
];

function mapPropertyType(text: string | null): string | null {
  if (!text) return null;
  const n = norm(text);
  const found = PROPERTY_TYPES.find((t) => norm(t) === n) ?? PROPERTY_TYPES.find((t) => n.includes(norm(t)));
  return found ?? null;
}

function emptyMatch(text: string | null): FieldMatch {
  return { text, id: null, label: null, confidence: 0, state: text ? "missing" : "missing", options: [] };
}

function buildMatch(text: string | null, candidates: Array<{ id: string | null; label: string }>, useStreetNorm = false): FieldMatch {
  if (!text) return emptyMatch(null);
  const scored = candidates
    .map((c) => ({
      ...c,
      confidence: useStreetNorm ? similarity(normStreet(text), normStreet(c.label)) : similarity(text, c.label),
    }))
    .filter((c) => c.confidence >= 55)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);

  const best = scored[0];
  const ambiguous = scored.length > 1 && scored[1].confidence >= 95 && best.confidence >= 95;
  const confidence = best ? (ambiguous ? Math.min(best.confidence, 90) : best.confidence) : 0;
  const state = stateForConfidence(confidence, !!best);
  return {
    text,
    id: best && state !== "missing" ? best.id : null,
    label: best && state !== "missing" ? best.label : null,
    confidence,
    state,
    options: scored,
  };
}

/* ------------------------------------------------------------------ *
 * Registros internos usados no relacionamento
 * ------------------------------------------------------------------ */
async function loadRegistries(admin: any, cityText: string | null, neighborhoodText: string | null) {
  const [{ data: streets }, { data: condos }, { data: bairros }, { data: cityRows }] = await Promise.all([
    admin.from("streets").select("id,name,official_name,city,neighborhood").eq("active", true),
    admin.from("condominiums").select("id,name,slug,region,address"),
    admin.from("editorial_pages").select("id,title,slug,content_type,cidade,bairro").in("content_type", ["bairro", "guia"]),
    admin.from("properties").select("city,neighborhood").not("city", "is", null).limit(5000),
  ]);

  const cities = new Map<string, string>();
  for (const r of cityRows ?? []) if (r.city) cities.set(norm(r.city), titleCase(r.city));
  for (const s of streets ?? []) if (s.city) cities.set(norm(s.city), titleCase(s.city));

  const cityFilter = cityText ? norm(cityText) : null;
  const neighborhoods = new Map<string, { id: string | null; label: string }>();
  for (const r of cityRows ?? []) {
    if (!r.neighborhood) continue;
    if (cityFilter && r.city && norm(r.city) !== cityFilter) continue;
    neighborhoods.set(norm(r.neighborhood), { id: null, label: titleCase(r.neighborhood) });
  }
  for (const g of bairros ?? []) {
    const label = g.bairro || g.title;
    if (!label) continue;
    neighborhoods.set(norm(label), { id: g.id, label });
  }

  const nFilter = neighborhoodText ? norm(neighborhoodText) : null;
  const streetCandidates = (streets ?? [])
    .filter((s: any) => {
      if (cityFilter && s.city && norm(s.city) !== cityFilter) return false;
      if (nFilter && s.neighborhood && norm(s.neighborhood) !== nFilter) return false;
      return true;
    })
    .map((s: any) => ({ id: s.id as string, label: (s.official_name || s.name) as string }));

  const condoCandidates = (condos ?? []).map((c: any) => ({ id: c.id as string, label: c.name as string }));

  return {
    cities: [...cities.values()].map((label) => ({ id: null as string | null, label })),
    neighborhoods: [...neighborhoods.values()],
    streets: streetCandidates,
    condos: condoCandidates,
  };
}

/* ------------------------------------------------------------------ *
 * Duplicidade
 * ------------------------------------------------------------------ */
async function findDuplicates(admin: any, listing: RawListing, condoId: string | null) {
  const externalRef = new URL(listing.url).pathname;
  const { data: exact } = await admin
    .from("properties")
    .select("id,slug,title,internal_code,address,city,neighborhood,condominium_name,price_sale,price_rent,images,created_at,external_ref,source_url")
    .or(`source_url.eq.${listing.url},external_ref.eq.${externalRef}`)
    .limit(1);

  const area = listing.areas.useful ?? listing.areas.built ?? listing.areas.total;
  let similar: any[] = [];
  if (!exact?.length) {
    let q = admin
      .from("properties")
      .select("id,slug,title,internal_code,address,city,neighborhood,condominium_name,price_sale,price_rent,images,area_useful,area_built,bedrooms")
      .limit(200);
    if (condoId) q = q.eq("condominium_id", condoId);
    else if (listing.address.neighborhood) q = q.ilike("neighborhood", `%${listing.address.neighborhood}%`);
    const { data } = await q;
    similar = (data ?? [])
      .map((p: any) => {
        let score = 0;
        if (condoId) score += 25;
        if (area && (p.area_useful || p.area_built)) {
          const pa = p.area_useful ?? p.area_built;
          if (Math.abs(pa - area) / area < 0.05) score += 25;
        }
        if (listing.rooms.bedrooms && p.bedrooms === listing.rooms.bedrooms) score += 15;
        const price = listing.prices.sale ?? listing.prices.rent;
        const pprice = p.price_sale ?? p.price_rent;
        if (price && pprice && Math.abs(pprice - price) / price < 0.03) score += 25;
        if (listing.title && p.title) score += Math.round(similarity(listing.title, p.title) / 10);
        return { ...p, score };
      })
      .filter((p: any) => p.score >= 60)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5);
  }

  return { exact: exact?.[0] ?? null, similar };
}

/* ------------------------------------------------------------------ *
 * Server functions
 * ------------------------------------------------------------------ */
async function assertAdmin(context: any) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
}

export const startPropertyImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { url: string }) => {
    if (!d?.url || typeof d.url !== "string") throw new Error("Informe a URL do anúncio.");
    return { url: d.url.trim() };
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const t0 = Date.now();
    const url = assertSafeUrl(data.url).toString();
    const parser = pickParser(url);
    if (!parser) throw new Error("O formato desta página ainda não possui um importador compatível.");

    const html = await fetchPage(url);
    const { listing, log } = parser.parse(html, url);
    if (!listing.title && !listing.images.length && !listing.prices.sale && !listing.prices.rent) {
      throw new Error("Não encontramos informações suficientes para criar o imóvel.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const reg = await loadRegistries(supabaseAdmin, listing.address.city, listing.address.neighborhood);

    const matches = {
      city: buildMatch(listing.address.city, reg.cities),
      neighborhood: buildMatch(listing.address.neighborhood, reg.neighborhoods),
      street: buildMatch(listing.address.street, reg.streets, true),
      condominium: buildMatch(listing.address.condominiumText, reg.condos),
    };

    const duplicates = await findDuplicates(supabaseAdmin, listing, matches.condominium.id);

    const draft: ImportDraft = {
      identification: {
        purpose: listing.purpose,
        property_type: mapPropertyType(listing.propertyTypeText),
        title: listing.title,
        external_code: listing.externalCode,
        internal_code: listing.internalCode,
      },
      location: {
        postal_code: listing.address.postalCode,
        state: listing.address.state,
        number: listing.address.number,
        complement: listing.address.complement,
      },
      prices: {
        price_sale: listing.prices.sale,
        price_rent: listing.prices.rent,
        condo_fee: listing.prices.condoFee,
        iptu: listing.prices.iptu,
      },
      characteristics: {
        area_total: listing.areas.total, area_built: listing.areas.built,
        area_useful: listing.areas.useful, area_land: listing.areas.land,
        bedrooms: listing.rooms.bedrooms, suites: listing.rooms.suites,
        bathrooms: listing.rooms.bathrooms, lavabos: listing.rooms.lavabos,
        parking: listing.rooms.parking, parking_covered: listing.rooms.parkingCovered,
        parking_uncovered: listing.rooms.parkingUncovered,
        features: listing.features, condo_features: listing.condoFeatures,
        unknown_features: listing.unknownFeatures,
      },
      description: { text: listing.descriptionText, html: listing.descriptionHtml },
      images: listing.images,
      cover_index: 0,
      matches,
      source: {
        url, parser: parser.id, label: parser.label,
        imported_at: new Date().toISOString(), external_code: listing.externalCode,
      },
      seo: listing.seo,
    };

    const fieldsFound = countFound(draft);
    const summary = {
      fields_found: fieldsFound.found,
      auto_related: fieldsFound.related,
      needs_review: fieldsFound.review,
      not_found: fieldsFound.missing,
      images: listing.images.length,
      exact_duplicate: !!duplicates.exact,
      similar_count: duplicates.similar.length,
      duration_ms: Date.now() - t0,
    };

    const { data: row, error } = await supabaseAdmin
      .from("property_imports")
      .insert({
        source_url: url,
        source_label: parser.label,
        parser: parser.id,
        external_code: listing.externalCode,
        status: duplicates.exact ? "duplicate" : "pending",
        draft: draft as any,
        raw: { listing } as any,
        log: { ...log, ...summary, url, at: new Date().toISOString() },
        summary,
        duplicates: duplicates as any,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { id: row.id as string, draft, summary, duplicates };
  });

function countFound(draft: ImportDraft) {
  const flat: unknown[] = [
    ...Object.values(draft.identification),
    ...Object.values(draft.location),
    ...Object.values(draft.prices),
    draft.characteristics.area_total, draft.characteristics.area_built, draft.characteristics.area_useful,
    draft.characteristics.bedrooms, draft.characteristics.suites, draft.characteristics.bathrooms,
    draft.characteristics.lavabos, draft.characteristics.parking,
    draft.description.text,
  ];
  const found = flat.filter((v) => v !== null && v !== undefined && v !== "").length
    + draft.characteristics.features.length + draft.characteristics.condo_features.length;
  const ms = Object.values(draft.matches);
  return {
    found,
    related: ms.filter((m) => m.state === "matched").length,
    review: ms.filter((m) => m.state === "review").length,
    missing: ms.filter((m) => m.state === "missing").length,
  };
}

export const listPropertyImports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("property_imports")
      .select("id,source_url,source_label,status,summary,draft,created_at,updated_at,property_id")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      source_url: r.source_url,
      source_label: r.source_label,
      status: r.status,
      title: r.draft?.identification?.title ?? null,
      progress: validationProgress(r.draft),
      created_at: r.created_at,
      updated_at: r.updated_at,
      property_id: r.property_id,
    }));
  });

function validationProgress(draft: any): number {
  if (!draft?.matches) return 0;
  const checks = [
    !!draft.identification?.purpose,
    !!draft.identification?.property_type,
    !!draft.location?.state,
    draft.matches.city?.state === "matched",
    draft.matches.neighborhood?.state === "matched",
    (draft.images?.length ?? 0) > 0,
    !!(draft.prices?.price_sale || draft.prices?.price_rent),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export const getPropertyImport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("property_imports").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return row as any;
  });

export const savePropertyImportDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; draft: ImportDraft }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("property_imports")
      .update({ draft: data.draft as any })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { saved: true, at: new Date().toISOString() };
  });

export const deletePropertyImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("property_imports").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { deleted: true };
  });

/** Busca cadastros internos para relacionamento manual. */
export const searchInternalRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: "condominium" | "street" | "neighborhood" | "city"; term: string }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const term = data.term.trim();
    if (data.kind === "condominium") {
      const { data: rows } = await supabaseAdmin
        .from("condominiums").select("id,name").ilike("name", `%${term}%`).order("name").limit(30);
      return (rows ?? []).map((r: any) => ({ id: r.id, label: r.name }));
    }
    if (data.kind === "street") {
      const { data: rows } = await supabaseAdmin
        .from("streets").select("id,name,official_name,city").ilike("name", `%${term}%`).limit(30);
      return (rows ?? []).map((r: any) => ({ id: r.id, label: r.official_name || r.name }));
    }
    if (data.kind === "neighborhood") {
      const { data: rows } = await supabaseAdmin
        .from("editorial_pages").select("id,title,bairro").in("content_type", ["bairro", "guia"])
        .ilike("title", `%${term}%`).limit(30);
      return (rows ?? []).map((r: any) => ({ id: r.id, label: r.bairro || r.title }));
    }
    const { data: rows } = await supabaseAdmin
      .from("properties").select("city").ilike("city", `%${term}%`).limit(200);
    const set = new Map<string, string>();
    for (const r of rows ?? []) if (r.city) set.set(norm(r.city), titleCase(r.city));
    return [...set.values()].map((label) => ({ id: null, label }));
  });

/** Cria rapidamente um condomínio sem sair da importação. */
export const quickCreateCondominium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; neighborhood?: string | null; city?: string | null }) => {
    if (!d?.name?.trim()) throw new Error("Informe o nome do condomínio.");
    return d;
  })
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const name = titleCase(data.name.trim());
    const slug = slugify(name);
    const { data: existing } = await supabaseAdmin
      .from("condominiums").select("id,name").eq("slug", slug).maybeSingle();
    if (existing) return { id: existing.id as string, label: existing.name as string, created: false };
    const region = [data.neighborhood, data.city].filter(Boolean).map((s) => titleCase(String(s))).join(" — ") || null;
    const { data: row, error } = await supabaseAdmin
      .from("condominiums").insert({ name, slug, region, status: "active", amenities: [] })
      .select("id,name").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, label: row.name as string, created: true };
  });

/* ------------------------------------------------------------------ *
 * Validação + gravação definitiva
 * ------------------------------------------------------------------ */
export type ChecklistItem = { key: string; label: string; ok: boolean; required: boolean; hint?: string };

export function buildChecklist(draft: ImportDraft): ChecklistItem[] {
  const m = draft.matches;
  return [
    { key: "title", label: "Identificação válida", ok: !!draft.identification.title, required: true },
    { key: "purpose", label: "Finalidade relacionada", ok: !!draft.identification.purpose, required: true },
    { key: "property_type", label: "Tipo relacionado", ok: !!draft.identification.property_type, required: true },
    { key: "state", label: "Estado informado", ok: !!draft.location.state, required: true },
    { key: "city", label: "Cidade relacionada", ok: m.city.state === "matched", required: true },
    { key: "neighborhood", label: "Bairro relacionado", ok: m.neighborhood.state === "matched", required: true },
    { key: "street", label: "Rua relacionada", ok: m.street.state === "matched" || !m.street.text, required: false },
    { key: "condominium", label: "Condomínio relacionado", ok: m.condominium.state === "matched" || !m.condominium.text, required: false },
    { key: "prices", label: "Valores processados", ok: !!(draft.prices.price_sale || draft.prices.price_rent), required: true },
    { key: "characteristics", label: "Características processadas", ok: true, required: false },
    { key: "images", label: "Fotos verificadas", ok: draft.images.length > 0, required: true },
  ];
}

export const commitPropertyImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; draft: ImportDraft; updateExistingId?: string | null }) => d)
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const draft = data.draft;
    const pending = buildChecklist(draft).filter((c) => c.required && !c.ok);
    if (pending.length) {
      throw new Error(`Existem campos que precisam ser corrigidos antes de salvar: ${pending.map((p) => p.label).join(", ")}`);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const externalRef = new URL(draft.source.url).pathname;
    const images = [...draft.images];
    if (draft.cover_index > 0 && draft.cover_index < images.length) {
      const [cover] = images.splice(draft.cover_index, 1);
      images.unshift(cover);
    }

    const payload: any = {
      external_ref: externalRef,
      source_url: draft.source.url,
      slug: `${slugify(draft.identification.title ?? "imovel")}-${draft.identification.external_code ?? Date.now()}`,
      title: draft.identification.title,
      purpose: draft.identification.purpose,
      property_type: draft.identification.property_type,
      internal_code: draft.identification.internal_code ?? draft.identification.external_code,
      city: draft.matches.city.label,
      state: draft.location.state,
      neighborhood: draft.matches.neighborhood.label,
      condominium_id: draft.matches.condominium.id,
      condominium_name: draft.matches.condominium.label,
      street_id: draft.matches.street.id,
      address: draft.matches.street.label,
      address_number: draft.location.number,
      postal_code: draft.location.postal_code,
      price_sale: draft.prices.price_sale,
      price_rent: draft.prices.price_rent,
      condo_fee: draft.prices.condo_fee,
      iptu: draft.prices.iptu,
      area_total: draft.characteristics.area_total,
      area_built: draft.characteristics.area_built,
      area_useful: draft.characteristics.area_useful,
      bedrooms: draft.characteristics.bedrooms,
      suites: draft.characteristics.suites,
      bathrooms: draft.characteristics.bathrooms,
      lavabos: draft.characteristics.lavabos,
      parking: draft.characteristics.parking,
      parking_covered: draft.characteristics.parking_covered,
      parking_uncovered: draft.characteristics.parking_uncovered,
      description: draft.description.text,
      descricao_original: draft.description.text,
      images,
      status: "active",
      review_status: "manual",
      extracted_at: draft.source.imported_at,
      last_seen_at: new Date().toISOString(),
      raw: { import_source: draft.source, seo_reference: draft.seo, features: draft.characteristics },
    };

    let propertyId: string;
    if (data.updateExistingId) {
      const { data: row, error } = await supabaseAdmin
        .from("properties").update(payload).eq("id", data.updateExistingId).select("id").single();
      if (error) throw new Error(error.message);
      propertyId = row.id as string;
    } else {
      const { data: row, error } = await supabaseAdmin
        .from("properties").upsert(payload, { onConflict: "external_ref" }).select("id").single();
      if (error) throw new Error(error.message);
      propertyId = row.id as string;
    }

    await supabaseAdmin.from("property_imports")
      .update({ status: "committed", property_id: propertyId, committed_at: new Date().toISOString(), draft: draft as any })
      .eq("id", data.id);

    await supabaseAdmin.from("cms_audit_log").insert({
      actor_id: context.userId,
      action: data.updateExistingId ? "import_update" : "import_create",
      entity_type: "property",
      entity_id: propertyId,
      details: {
        message: "Imóvel criado por importação de URL",
        url: draft.source.url,
        source: draft.source.label,
        external_code: draft.source.external_code,
        imported_at: draft.source.imported_at,
      },
    });

    return { propertyId };
  });
