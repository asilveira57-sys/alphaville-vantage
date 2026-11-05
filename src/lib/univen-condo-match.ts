// Vínculo de condomínio pela etiqueta "Empreendimento" da Univen (ou campo development).
// Puro: usado pela sincronização, pela tela "Etiquetas da Univen" e pelos relatórios.
import { canonicalNumWords } from "./property-search";

export type CondoUsage = "residencial" | "comercial" | "misto";
export type CondoRef = { id: string; name: string; slug: string; usage: CondoUsage | null; status?: string };
export type CondoAliasRef = { normalized_alias: string; condominium_id: string | null; is_not_condominium: boolean };
export type UnivenAliasRef = { normalized_tag: string; usage: CondoUsage | null; condominium_id: string | null; ignored: boolean };

export const NOT_APPLICABLE_SLUG = "nao-se-aplica";

/** Normaliza etiqueta/nome: sem acento, minúsculo, números equivalentes (1 = I = Um = 01). */
export function normTag(s: string | null | undefined): string {
  const t = (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  return canonicalNumWords(t);
}

const COMMERCIAL = /^(sala|loja|ponto|predio|galpao|conjunto|escritorio)/;
const RESIDENTIAL = /^(casa|apartamento|terreno|cobertura|sobrado|flat|studio|kitnet)/;

/** Uso exigido pelo tipo do imóvel (null = sem restrição: área, chácara, fazenda…). */
export function usageForType(type: string | null | undefined): "residencial" | "comercial" | null {
  const t = (type ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (COMMERCIAL.test(t)) return "comercial";
  if (RESIDENTIAL.test(t)) return "residencial";
  return null;
}

/** Sala/loja/ponto/prédio/galpão só em comercial/misto; casa/apto/terreno só em residencial/misto. */
export function usageCompatible(condoUsage: CondoUsage | null | undefined, type: string | null | undefined): boolean {
  const need = usageForType(type);
  if (!need || !condoUsage || condoUsage === "misto") return true;
  return condoUsage === need;
}

export type MatchResult =
  | { kind: "match"; condo: CondoRef; via: "univen_alias" | "name" | "alias" }
  | { kind: "incompatible"; condo: CondoRef }
  | { kind: "ignored" }
  | { kind: "none" };

export function buildCondoIndex(condos: CondoRef[], aliases: CondoAliasRef[], univen: UnivenAliasRef[]) {
  const byId = new Map(condos.map((c) => [c.id, c]));
  const byName = new Map<string, CondoRef[]>();
  const add = (k: string, c: CondoRef | undefined) => {
    if (!k || !c || c.slug === NOT_APPLICABLE_SLUG) return;
    const l = byName.get(k) ?? [];
    if (!l.some((x) => x.id === c.id)) l.push(c);
    byName.set(k, l);
  };
  for (const c of condos) add(normTag(c.name), c);
  for (const a of aliases) if (!a.is_not_condominium && a.condominium_id) add(normTag(a.normalized_alias), byId.get(a.condominium_id));
  const notCondo = new Set(aliases.filter((a) => a.is_not_condominium).map((a) => normTag(a.normalized_alias)));
  return { byId, byName, notCondo, univen };
}
export type CondoIndex = ReturnType<typeof buildCondoIndex>;

/** Resolve a etiqueta para um condomínio, respeitando o uso do condomínio x tipo do imóvel. */
export function matchTag(idx: CondoIndex, tag: string | null | undefined, type: string | null | undefined): MatchResult {
  const k = normTag(tag);
  if (!k) return { kind: "none" };
  const need = usageForType(type);
  const rows = idx.univen.filter((u) => normTag(u.normalized_tag) === k);
  if (rows.length) {
    if (rows.every((r) => r.ignored)) return { kind: "ignored" };
    // Mapeamento específico por uso (ex.: "Link" → Studios ou Offices) vence o genérico.
    const pick = rows.find((r) => !r.ignored && r.usage && r.usage === need) ?? rows.find((r) => !r.ignored && !r.usage);
    const condo = pick?.condominium_id ? idx.byId.get(pick.condominium_id) : undefined;
    if (condo) return usageCompatible(condo.usage, type) ? { kind: "match", condo, via: "univen_alias" } : { kind: "incompatible", condo };
    const any = rows.find((r) => !r.ignored && r.condominium_id);
    const c2 = any?.condominium_id ? idx.byId.get(any.condominium_id) : undefined;
    if (c2) return { kind: "incompatible", condo: c2 };
  }
  if (idx.notCondo.has(k)) return { kind: "ignored" };
  const cands = idx.byName.get(k) ?? [];
  if (!cands.length) return { kind: "none" };
  const ok = cands.filter((c) => usageCompatible(c.usage, type));
  if (ok.length === 1) return { kind: "match", condo: ok[0], via: "name" };
  if (ok.length > 1) {
    const pub = ok.filter((c) => !c.status || c.status === "published");
    return pub.length === 1 ? { kind: "match", condo: pub[0], via: "name" } : { kind: "none" };
  }
  return { kind: "incompatible", condo: cands[0] };
}

/** Etiqueta do empreendimento num imóvel da API (tag "Empreendimento" ou campo development). */
export function univenTag(p: { custom_tags?: { group_name?: string; name?: string }[]; development?: { name?: string } | null }): string | null {
  const t = p.custom_tags?.find((x) => x.group_name === "Empreendimento")?.name ?? p.development?.name ?? null;
  return t && t.trim() ? t.trim() : null;
}

/** Ajuste manual de condomínio: nunca mexer. */
export function hasManualCondo(mo: Record<string, unknown> | null | undefined): boolean {
  return !!mo && ("condominium_id" in mo || "condominium_name" in mo);
}
