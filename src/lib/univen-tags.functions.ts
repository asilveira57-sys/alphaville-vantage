// Tela "Etiquetas da Univen": etiquetas de empreendimento sem condomínio, mapeamento e exportação.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CondoUsage } from "./univen-condo-match";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Apenas administradores");
}

type Row = { id: string; internal_code: string | null; univen_empreendimento: string | null; condominium_id: string | null; property_type: string | null; neighborhood: string | null; city: string | null; manual_overrides: Record<string, unknown> | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadAll(sb: any) {
  const { fetchAllRows } = await import("./fetch-all");
  const { loadCondoIndex } = await import("./tokko-sync.server");
  const rows = await fetchAllRows<Row>((f, t) => sb.from("properties")
    .select("id,internal_code,univen_empreendimento,condominium_id,property_type,neighborhood,city,manual_overrides")
    .eq("status", "active").order("created_at").range(f, t));
  const idx = await loadCondoIndex(sb);
  const { data: ua } = await sb.from("univen_condo_aliases").select("id,tag,normalized_tag,usage,condominium_id,ignored").order("tag");
  return { rows, idx, ua: (ua ?? []) as { id: string; tag: string; normalized_tag: string; usage: CondoUsage | null; condominium_id: string | null; ignored: boolean }[] };
}

const mode = (l: (string | null)[]) => {
  const m = new Map<string, number>();
  for (const x of l) if (x) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};

/** Etiquetas de imóveis ativos sem condomínio que não casam com a Central. */
export const listUnivenTags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { matchTag, normTag, usageForType } = await import("./univen-condo-match");
    const { rows, idx, ua } = await loadAll(supabaseAdmin);
    const groups = new Map<string, { tag: string; codes: string[]; reason: string; types: (string | null)[]; nbs: (string | null)[]; cities: (string | null)[] }>();
    for (const r of rows) {
      if (r.condominium_id || !r.univen_empreendimento) continue;
      const m = matchTag(idx, r.univen_empreendimento, r.property_type);
      if (m.kind === "match" || m.kind === "ignored") continue;
      const k = normTag(r.univen_empreendimento);
      const g = groups.get(k) ?? { tag: r.univen_empreendimento, codes: [], reason: "", types: [], nbs: [], cities: [] };
      g.codes.push(r.internal_code ?? r.id);
      g.types.push(usageForType(r.property_type));
      g.nbs.push(r.neighborhood); g.cities.push(r.city);
      if (m.kind === "incompatible") g.reason = `uso incompatível com ${m.condo.name}`;
      groups.set(k, g);
    }
    const unmapped = [...groups.values()].map((g) => {
      const res = g.types.filter((t) => t === "residencial").length, com = g.types.filter((t) => t === "comercial").length;
      return {
        tag: g.tag, count: g.codes.length, codes: g.codes, reason: g.reason || "sem cadastro",
        suggestion: { neighborhood: mode(g.nbs), city: mode(g.cities), usage: (res && com ? "misto" : com ? "comercial" : "residencial") as CondoUsage },
      };
    }).sort((a, b) => b.count - a.count);
    const condos = [...idx.byId.values()].filter((c) => !c.status || c.status === "published")
      .map((c) => ({ id: c.id, name: c.name, usage: c.usage })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    // Mapeamentos existentes, com a quantidade de imóveis ativos com a etiqueta.
    const tagCount = new Map<string, number>();
    for (const r of rows) if (r.univen_empreendimento) { const k = normTag(r.univen_empreendimento); tagCount.set(k, (tagCount.get(k) ?? 0) + 1); }
    const mapped = ua.map((u) => ({ id: u.id, tag: u.tag, usage: u.usage, condominium: u.condominium_id ? idx.byId.get(u.condominium_id)?.name ?? null : null, ignored: u.ignored, count: tagCount.get(normTag(u.normalized_tag)) ?? 0 }));
    return { unmapped, condos, mapped, withoutCondo: rows.filter((r) => !r.condominium_id).length };
  });

/** Grava o apelido e vincula agora os imóveis sem condomínio (e sem ajuste manual) com essa etiqueta. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mapAndApply(sb: any, tag: string, condominiumId: string, usage: CondoUsage | null) {
  const { normTag, matchTag, hasManualCondo } = await import("./univen-condo-match");
  const { relinkSlug } = await import("./tokko-sync.server");
  const { regenerateSeoForIds } = await import("./property-seo-regen.server");
  const k = normTag(tag);
  const { data: ex } = await sb.from("univen_condo_aliases").select("id").eq("normalized_tag", k).is("usage", usage).maybeSingle();
  const row = { tag, normalized_tag: k, usage, condominium_id: condominiumId, ignored: false };
  const { error } = ex ? await sb.from("univen_condo_aliases").update(row).eq("id", ex.id) : await sb.from("univen_condo_aliases").insert(row);
  if (error) throw new Error(error.message);
  const { rows, idx } = await loadAll(sb);
  const linked: string[] = []; const skipped: string[] = [];
  for (const r of rows) {
    if (r.condominium_id || hasManualCondo(r.manual_overrides) || normTag(r.univen_empreendimento) !== k) continue;
    const m = matchTag(idx, r.univen_empreendimento, r.property_type);
    if (m.kind !== "match") { skipped.push(`${r.internal_code} (${m.kind === "incompatible" ? "uso incompatível" : "não casou"})`); continue; }
    const { error: e } = await sb.from("properties").update({ condominium_id: m.condo.id, condominium_name: m.condo.name }).eq("id", r.id);
    if (e) { skipped.push(`${r.internal_code}: ${e.message}`); continue; }
    await relinkSlug(sb, r.id);
    linked.push(r.id);
  }
  if (linked.length) await regenerateSeoForIds(sb, linked);
  return { linked: linked.length, skipped };
}

export const mapUnivenTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tag: string; condominiumId: string; usage?: CondoUsage | null }) => ({
    tag: String(d?.tag ?? "").trim(), condominiumId: String(d?.condominiumId ?? ""),
    usage: (["residencial", "comercial", "misto"].includes(String(d?.usage)) ? d.usage : null) as CondoUsage | null,
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (!data.tag || !data.condominiumId) throw new Error("Informe etiqueta e condomínio");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return mapAndApply(supabaseAdmin, data.tag, data.condominiumId, data.usage);
  });

export const createCondoForTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tag: string; name: string; region?: string | null; usage: CondoUsage }) => ({
    tag: String(d?.tag ?? "").trim(), name: String(d?.name ?? "").trim(), region: d?.region ? String(d.region).trim() : null,
    usage: (["residencial", "comercial", "misto"].includes(String(d?.usage)) ? d.usage : "residencial") as CondoUsage,
  }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (!data.tag || data.name.length < 2) throw new Error("Informe etiqueta e nome");
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    let slug = data.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { data: clash } = await sb.from("condominiums").select("id").eq("slug", slug).maybeSingle();
    if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    const { data: c, error } = await sb.from("condominiums")
      .insert({ name: data.name, slug, region: data.region, usage: data.usage, status: "published", amenities: [] }).select("id").single();
    if (error) throw new Error(error.message);
    const r = await mapAndApply(sb, data.tag, c.id, null);
    return { ...r, condominiumId: c.id };
  });
