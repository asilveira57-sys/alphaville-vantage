import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logCmsAction } from "@/lib/audit.server";

export type CondoGroup = {
  id: string;
  name: string;
  region: string | null;
  slug: string;
  status: string;
  propertiesCount: number;
  aliases: string[];
  guideSlug: string | null;
  guideId: string | null;
  guideStatus: string | null;
};

export type AliasGroup = {
  alias: string;
  count: number;
  suggestion: { id: string; name: string } | null;
};

export type CondoPropertyRow = {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  internal_code: string | null;
  purpose: string | null;
  price_sale: number | null;
  price_rent: number | null;
  condominium_name: string | null;
  condominium_id: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  region: string | null;
  suggestion: { id: string | null; label: string; score: number } | null;
};

const PROP_SELECT =
  "id,slug,title,images,internal_code,purpose,price_sale,price_rent,condominium_name,condominium_id,address,neighborhood,city,region";


export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugify(s: string): string {
  return normalizeName(s).replace(/\s+/g, "-").slice(0, 80) || "condominio";
}

type SB = { from: (t: string) => any };

async function fetchAllRows<T>(sb: SB, table: string, select: string, apply?: (q: any) => any): Promise<T[]> {
  const step = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += step) {
    let q = sb.from(table).select(select);
    if (apply) q = apply(q);
    const { data, error } = await q.range(from, from + step - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as T[];
    out.push(...batch);
    if (batch.length < step) break;
  }
  return out;
}

const firstImage = (images: unknown): string | null => {
  if (!Array.isArray(images)) return null;
  const first = images[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && typeof (first as { url?: string }).url === "string")
    return (first as { url: string }).url;
  return null;
};

const toRow = (r: Record<string, unknown>): CondoPropertyRow => ({
  id: String(r["id"]),
  slug: String(r["slug"] ?? ""),
  title: String(r["title"] ?? ""),
  image: firstImage(r["images"]),
  internal_code: (r["internal_code"] as string | null) ?? null,
  purpose: (r["purpose"] as string | null) ?? null,
  price_sale: (r["price_sale"] as number | null) ?? null,
  price_rent: (r["price_rent"] as number | null) ?? null,
  condominium_name: (r["condominium_name"] as string | null) ?? null,
  condominium_id: (r["condominium_id"] as string | null) ?? null,
  address: (r["address"] as string | null) ?? null,
  neighborhood: (r["neighborhood"] as string | null) ?? null,
  city: (r["city"] as string | null) ?? null,
  region: (r["region"] as string | null) ?? null,
  suggestion: null,
});


/** Panorama completo: condomínios oficiais + nomes soltos do scrap. */
export const listCondominiumOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{
    condos: CondoGroup[];
    unclassified: AliasGroup[];
    stats: { condos: number; withGuide: number; withoutGuide: number; unclassifiedNames: number; unclassifiedProps: number; linkedProps: number; totalProps: number };
  }> => {
    const sb = context.supabase as unknown as SB;

    const [props, condos, aliases, pages] = await Promise.all([
      fetchAllRows<Record<string, unknown>>(sb, "properties", "id,condominium_id,condominium_name", (q) =>
        q.eq("status", "active"),
      ),
      fetchAllRows<Record<string, unknown>>(sb, "condominiums", "id,name,region,slug,status"),
      fetchAllRows<Record<string, unknown>>(sb, "condominium_aliases", "alias,normalized_alias,condominium_id,is_not_condominium"),
      fetchAllRows<Record<string, unknown>>(sb, "editorial_pages", "id,slug,title,status,related_condominium,content_type", (q) =>
        q.eq("content_type", "condominio"),
      ),
    ]);

    const countById = new Map<string, number>();
    const countByName = new Map<string, number>();
    let linked = 0;
    for (const p of props) {
      const cid = p["condominium_id"] as string | null;
      if (cid) {
        linked++;
        countById.set(cid, (countById.get(cid) ?? 0) + 1);
      } else {
        const n = ((p["condominium_name"] as string | null) ?? "").trim();
        if (n) countByName.set(n, (countByName.get(n) ?? 0) + 1);
      }
    }

    const aliasByCondo = new Map<string, string[]>();
    const aliasNorms = new Map<string, { condominium_id: string | null; is_not: boolean }>();
    for (const a of aliases) {
      const norm = String(a["normalized_alias"]);
      const cid = (a["condominium_id"] as string | null) ?? null;
      aliasNorms.set(norm, { condominium_id: cid, is_not: !!a["is_not_condominium"] });
      if (cid) aliasByCondo.set(cid, [...(aliasByCondo.get(cid) ?? []), String(a["alias"])]);
    }

    const pageByCondo = new Map<string, Record<string, unknown>>();
    const pageByNorm = new Map<string, Record<string, unknown>>();
    for (const pg of pages) {
      const rc = pg["related_condominium"] as string | null;
      if (rc) pageByCondo.set(rc, pg);
      pageByNorm.set(normalizeName(String(pg["title"] ?? "")), pg);
    }

    const condoGroups: CondoGroup[] = condos
      .map((c) => {
        const id = String(c["id"]);
        const name = String(c["name"]);
        const page = pageByCondo.get(id) ?? pageByNorm.get(normalizeName(name)) ?? null;
        return {
          id,
          name,
          region: (c["region"] as string | null) ?? null,
          slug: String(c["slug"]),
          status: String(c["status"] ?? "draft"),
          propertiesCount: countById.get(id) ?? 0,
          aliases: aliasByCondo.get(id) ?? [],
          guideSlug: page ? String(page["slug"]) : null,
          guideId: page ? String(page["id"]) : null,
          guideStatus: page ? String(page["status"]) : null,
        };
      })
      .sort((a, b) => b.propertiesCount - a.propertiesCount || a.name.localeCompare(b.name, "pt-BR"));

    const byNorm = new Map(condoGroups.map((c) => [normalizeName(c.name), c]));
    const unclassified: AliasGroup[] = [...countByName.entries()]
      .filter(([name]) => {
        const info = aliasNorms.get(normalizeName(name));
        return !info?.is_not;
      })
      .map(([alias, count]) => {
        const norm = normalizeName(alias);
        const direct = byNorm.get(norm);
        const partial =
          direct ??
          condoGroups.find((c) => {
            const cn = normalizeName(c.name);
            return cn.length >= 4 && (norm.includes(cn) || cn.includes(norm));
          });
        return { alias, count, suggestion: partial ? { id: partial.id, name: partial.name } : null };
      })
      .sort((a, b) => b.count - a.count);

    return {
      condos: condoGroups,
      unclassified,
      stats: {
        condos: condoGroups.length,
        withGuide: condoGroups.filter((c) => c.guideId).length,
        withoutGuide: condoGroups.filter((c) => !c.guideId).length,
        unclassifiedNames: unclassified.length,
        unclassifiedProps: unclassified.reduce((s, u) => s + u.count, 0),
        linkedProps: linked,
        totalProps: props.length,
      },
    };
  });

export type SuggestionBucket = {
  condominiumId: string | null;
  label: string;
  count: number;
  propertyIds: string[];
};

/** Constrói o índice de nomes oficiais/apelidos para sugerir vínculo. */
function buildCondoIndex(condos: Record<string, unknown>[], aliases: Record<string, unknown>[]) {
  const idx: { norm: string; id: string; label: string }[] = [];
  const nameById = new Map<string, string>();
  for (const c of condos) {
    const id = String(c["id"]);
    const name = String(c["name"] ?? "");
    nameById.set(id, name);
    const norm = normalizeName(name);
    if (norm.length >= 5) idx.push({ norm, id, label: name });
  }
  for (const a of aliases) {
    const cid = (a["condominium_id"] as string | null) ?? null;
    if (!cid) continue;
    const norm = String(a["normalized_alias"] ?? "");
    if (norm.length >= 5) idx.push({ norm, id: cid, label: nameById.get(cid) ?? String(a["alias"]) });
  }
  return idx.sort((a, b) => b.norm.length - a.norm.length);
}

function suggestFor(row: Record<string, unknown>, idx: { norm: string; id: string; label: string }[]) {
  const text = normalizeName(
    [row["title"], row["address"], row["neighborhood"], row["region"]].filter(Boolean).join(" "),
  );
  if (!text) return null;
  for (const c of idx) {
    if (text.includes(c.norm)) return { id: c.id, label: c.label, score: c.norm.length };
  }
  return null;
}

/** Imóveis de um condomínio oficial ou de um nome solto — paginado, com sugestões. */
export const listGroupProperties = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        condominiumId: z.string().uuid().nullable().default(null),
        alias: z.string().nullable().default(null),
        search: z.string().default(""),
        onlyWithoutSuggestion: z.boolean().default(false),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(5).max(100).default(30),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ items: CondoPropertyRow[]; total: number; buckets: SuggestionBucket[] }> => {
    const sb = context.supabase as unknown as SB;
    if (!data.condominiumId && !data.alias) return { items: [], total: 0, buckets: [] };

    const [rows, condos, aliases] = await Promise.all([
      fetchAllRows<Record<string, unknown>>(sb, "properties", PROP_SELECT, (q) => {
        let qq = q.eq("status", "active");
        qq = data.condominiumId ? qq.eq("condominium_id", data.condominiumId) : qq.eq("condominium_name", data.alias);
        return qq.order("title", { ascending: true });
      }),
      fetchAllRows<Record<string, unknown>>(sb, "condominiums", "id,name"),
      fetchAllRows<Record<string, unknown>>(sb, "condominium_aliases", "alias,normalized_alias,condominium_id"),
    ]);

    const idx = buildCondoIndex(condos, aliases);
    const enriched = rows.map((r) => {
      const row = toRow(r);
      const s = data.condominiumId ? null : suggestFor(r, idx);
      row.suggestion = s ? { id: s.id, label: s.label, score: s.score } : null;
      return row;
    });

    // Blocos por sugestão (sobre o grupo inteiro, não só a página)
    const bucketMap = new Map<string, SuggestionBucket>();
    for (const row of enriched) {
      const key = row.suggestion?.id ?? "__none__";
      const label = row.suggestion?.label ?? "Sem sugestão";
      const b = bucketMap.get(key) ?? { condominiumId: row.suggestion?.id ?? null, label, count: 0, propertyIds: [] };
      b.count++;
      b.propertyIds.push(row.id);
      bucketMap.set(key, b);
    }
    const buckets = [...bucketMap.values()].sort(
      (a, b) => (a.condominiumId ? 0 : 1) - (b.condominiumId ? 0 : 1) || b.count - a.count,
    );

    const term = normalizeName(data.search);
    let filtered = term
      ? enriched.filter((r) =>
          normalizeName([r.title, r.address, r.neighborhood, r.internal_code].filter(Boolean).join(" ")).includes(term),
        )
      : enriched;
    if (data.onlyWithoutSuggestion) filtered = filtered.filter((r) => !r.suggestion);

    const start = (data.page - 1) * data.pageSize;
    return { items: filtered.slice(start, start + data.pageSize), total: filtered.length, buckets };
  });


/** Cria um condomínio oficial. */
export const createCondominium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().min(2), region: z.string().nullable().default(null), alias: z.string().nullable().default(null) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const sb = context.supabase as unknown as SB;
    const name = data.name.trim();
    let slug = slugify(name);
    const { data: existing } = await sb.from("condominiums").select("id").eq("slug", slug).maybeSingle();
    if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: created, error } = await sb
      .from("condominiums")
      .insert({ name, slug, region: data.region, status: "published" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const id = String((created as { id: string }).id);

    if (data.alias) await linkAlias(sb, data.alias, id);
    await logCmsAction(context as never, { action: "create", entity_type: "condominium", entity_id: id, details: { name } });
    return { id };
  });

async function linkAlias(sb: SB, alias: string, condominiumId: string | null, isNot = false) {
  const norm = normalizeName(alias);
  if (!norm) return;
  const { error } = await sb
    .from("condominium_aliases")
    .upsert(
      { alias, normalized_alias: norm, condominium_id: condominiumId, is_not_condominium: isNot },
      { onConflict: "normalized_alias" },
    );
  if (error) throw new Error(error.message);
}

async function updateProperties(sb: SB, ids: string[], patch: Record<string, unknown>) {
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { error } = await sb.from("properties").update(patch).in("id", chunk);
    if (error) throw new Error(error.message);
  }
}

/** Vincula todos os imóveis de um nome solto a um condomínio oficial. */
export const assignAliasToCondominium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ alias: z.string().min(1), condominiumId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ moved: number }> => {
    const sb = context.supabase as unknown as SB;
    const rows = await fetchAllRows<Record<string, unknown>>(sb, "properties", "id", (q) =>
      q.eq("condominium_name", data.alias).is("condominium_id", null),
    );
    const ids = rows.map((r) => String(r["id"]));
    if (ids.length) await updateProperties(sb, ids, { condominium_id: data.condominiumId });
    await linkAlias(sb, data.alias, data.condominiumId);
    await logCmsAction(context as never, {
      action: "assign_alias",
      entity_type: "condominium",
      entity_id: data.condominiumId,
      details: { alias: data.alias, moved: ids.length },
    });
    return { moved: ids.length };
  });

/** Move imóveis específicos para outro condomínio (ou desvincula). */
export const assignPropertiesToCondominium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ propertyIds: z.array(z.string().uuid()).min(1), condominiumId: z.string().uuid().nullable() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ moved: number }> => {
    const sb = context.supabase as unknown as SB;
    await updateProperties(sb, data.propertyIds, { condominium_id: data.condominiumId });
    await logCmsAction(context as never, {
      action: "assign_properties",
      entity_type: "condominium",
      entity_id: data.condominiumId,
      details: { count: data.propertyIds.length },
    });
    return { moved: data.propertyIds.length };
  });

/** Marca um nome do scrap como "não é condomínio": limpa o texto dos imóveis. */
export const markAliasNotCondominium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ alias: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }): Promise<{ cleared: number }> => {
    const sb = context.supabase as unknown as SB;
    const rows = await fetchAllRows<Record<string, unknown>>(sb, "properties", "id", (q) =>
      q.eq("condominium_name", data.alias).is("condominium_id", null),
    );
    const ids = rows.map((r) => String(r["id"]));
    if (ids.length) await updateProperties(sb, ids, { condominium_name: null });
    await linkAlias(sb, data.alias, null, true);
    await logCmsAction(context as never, {
      action: "alias_not_condominium",
      entity_type: "condominium_alias",
      entity_id: null,
      details: { alias: data.alias, cleared: ids.length },
    });
    return { cleared: ids.length };
  });

/** Renomeia um condomínio oficial. */
export const updateCondominium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), name: z.string().min(2), region: z.string().nullable().default(null) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const sb = context.supabase as unknown as SB;
    const { error } = await sb.from("condominiums").update({ name: data.name.trim(), region: data.region }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logCmsAction(context as never, { action: "update", entity_type: "condominium", entity_id: data.id, details: { name: data.name } });
    return { ok: true };
  });

/** Unifica condomínios: move imóveis, apelidos, guias e cria redirecionamento 301. */
export const mergeCondominiums = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ targetId: z.string().uuid(), sourceIds: z.array(z.string().uuid()).min(1) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ moved: number; redirects: number }> => {
    const sb = context.supabase as unknown as SB;
    const sources = data.sourceIds.filter((id) => id !== data.targetId);
    if (!sources.length) return { moved: 0, redirects: 0 };

    const { data: target, error: tErr } = await sb.from("condominiums").select("id,name,slug").eq("id", data.targetId).single();
    if (tErr) throw new Error(tErr.message);

    const { data: srcRows } = await sb.from("condominiums").select("id,name,slug").in("id", sources);
    const srcList = (srcRows ?? []) as { id: string; name: string; slug: string }[];

    // imóveis
    const props = await fetchAllRows<Record<string, unknown>>(sb, "properties", "id", (q) => q.in("condominium_id", sources));
    const ids = props.map((r) => String(r["id"]));
    if (ids.length) await updateProperties(sb, ids, { condominium_id: data.targetId });

    // apelidos passam a apontar para o alvo + o nome antigo vira apelido
    for (const s of srcList) {
      await sb.from("condominium_aliases").update({ condominium_id: data.targetId }).eq("condominium_id", s.id);
      await linkAlias(sb, s.name, data.targetId);
    }

    // páginas de guia dos condomínios absorvidos: redireciona para a do alvo
    let redirects = 0;
    const { data: targetPage } = await sb
      .from("editorial_pages")
      .select("slug")
      .eq("content_type", "condominio")
      .eq("related_condominium", data.targetId)
      .maybeSingle();
    const targetSlug = (targetPage as { slug?: string } | null)?.slug ?? null;

    if (targetSlug) {
      const { data: srcPages } = await sb
        .from("editorial_pages")
        .select("id,slug")
        .eq("content_type", "condominio")
        .in("related_condominium", sources);
      for (const pg of ((srcPages ?? []) as { id: string; slug: string }[])) {
        if (pg.slug === targetSlug) continue;
        const { error } = await sb.from("seo_redirects").insert({
          old_url: `/condominios/${pg.slug}`,
          new_url: `/condominios/${targetSlug}`,
          redirect_type: 301,
          active: true,
        });
        if (!error) redirects++;
      }
    }

    const { error: delErr } = await sb.from("condominiums").delete().in("id", sources);
    if (delErr) throw new Error(delErr.message);

    await logCmsAction(context as never, {
      action: "merge",
      entity_type: "condominium",
      entity_id: data.targetId,
      details: { sources: srcList.map((s) => s.name), moved: ids.length, redirects, target: (target as { name: string }).name },
    });
    return { moved: ids.length, redirects };
  });

/** Cria (ou reaproveita) a página de guia do condomínio no CMS. */
export const createCondominiumGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ condominiumId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ pageId: string; created: boolean }> => {
    const sb = context.supabase as unknown as SB;
    const { data: condo, error } = await sb.from("condominiums").select("id,name,slug,region").eq("id", data.condominiumId).single();
    if (error) throw new Error(error.message);
    const c = condo as { id: string; name: string; slug: string; region: string | null };

    const { data: existing } = await sb
      .from("editorial_pages")
      .select("id")
      .eq("content_type", "condominio")
      .eq("related_condominium", c.id)
      .maybeSingle();
    if (existing) return { pageId: String((existing as { id: string }).id), created: false };

    let slug = c.slug;
    const { data: slugTaken } = await sb.from("editorial_pages").select("id").eq("slug", slug).maybeSingle();
    if (slugTaken) slug = `${slug}-condominio`;

    const { data: created, error: insErr } = await sb
      .from("editorial_pages")
      .insert({
        title: c.name,
        slug,
        content_type: "condominio",
        status: "draft",
        html_content: "",
        related_condominium: c.id,
        related_neighborhood: c.region,
        properties_block_enabled: true,
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    const pageId = String((created as { id: string }).id);
    await logCmsAction(context as never, { action: "create_guide", entity_type: "condominium", entity_id: c.id, details: { pageId, slug } });
    return { pageId, created: true };
  });
