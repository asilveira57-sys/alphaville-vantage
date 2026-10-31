import { createClient } from "@supabase/supabase-js";
import { applyFiltersLegacy, type LegacyRow } from "../src/lib/property-filter-legacy";
import { toRpcArgs, effectiveSearch, IMOVEIS_DEFAULTS, type ImoveisSearch } from "../src/lib/property-query";
import { resolveCondoTokens } from "../src/lib/property-search.functions";
import { compareListingPrice } from "../src/lib/property-listing";
const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!);
const rows: any[] = [];
for (let f = 0; ; f += 1000) {
  const { data, error } = await sb.from("properties").select("purpose,property_type,city,neighborhood,condominium_id,condominium_name,region,bedrooms,parking,parking_covered,parking_uncovered,area_useful,area_built,area_total,price_sale,price_rent,last_seen_at,title,seo_title,description,descricao_seo").eq("status","active").range(f, f+999);
  if (error) throw error; rows.push(...data!); if (data!.length < 1000) break;
}
const { data: condos } = await sb.from("condominiums").select("id,name,slug");
const { data: aliases } = await sb.from("condominium_aliases").select("condominium_id,normalized_alias");
const cm = new Map((condos ?? []).map((c: any) => [c.id, c.name]));
const am = new Map<string, string[]>();
for (const a of aliases ?? []) am.set(a.condominium_id, [...(am.get(a.condominium_id) ?? []), a.normalized_alias]);
const items: LegacyRow[] = rows.map((r) => ({
  ...r,
  condo_official: cm.get(r.condominium_id) ?? null,
  condo_aliases: (am.get(r.condominium_id) ?? []).join(" ") || null,
}));
const cases: [string, Partial<ImoveisSearch>][] = [
  ["sem filtro", {}], ["texto: genesis", { q: "genesis" }], ["texto: tamboré 3", { q: "tamboré 3" }],
  ["texto: casa 4 suítes", { q: "casa 4 suítes" }], ["venda", { purpose: "sale" }], ["locação", { purpose: "rent" }],
  ["venda e locação", { purpose: "both" }], ["venda R$1–3 mi", { purpose: "sale", priceMin: 1_000_000, priceMax: 3_000_000 }],
  ["venda R$1–2 mi (min/max novos)", { purpose: "sale", min: 1_000_000, max: 2_000_000 }],
  ["locação até R$10 mil", { purpose: "rent", priceMax: 10_000 }], ["casa em Santana de Parnaíba", { type: "casa", city: "Santana de Parnaíba" }],
  ["bairro Alphaville + 3 dorm.", { neighborhood: "Alphaville", bedrooms: 3 }], ["apto 2 vagas 80 m²+", { type: "apartamento", parking: 2, areaMin: 80 }],
  ["texto: casa com piscina em santana de parnaiba", { q: "casa com piscina em santana de parnaiba" }],
  ["texto: residencial 1", { q: "residencial 1" }], ["texto: residencial um", { q: "residencial um" }],
  ["texto: residencial i", { q: "residencial i" }], ["texto: residencial 01", { q: "residencial 01" }],
  ["texto: apartamento para alugar até 5 mil", { q: "apartamento para alugar até 5 mil" }],
  ["condomínio Life Park (nome antigo)", { condo: "Life Park" }],
  ["condos: residencial-1 + residencial-2", { condo: "residencial-1,residencial-2" }],
];
console.log("| Combinação | Versão atual | Versão nova | Igual |\n|---|---|---|---|");
let bad = 0;
for (const [label, c] of cases) {
  const s = { ...IMOVEIS_DEFAULTS, ...c };
  const eff = effectiveSearch(s);
  const condoIds = eff.condo ? resolveCondoTokens(eff.condo, (condos ?? []) as any) : null;
  const legacy = applyFiltersLegacy(items as any, { ...eff, condoIds } as any).length;
  const { data, error } = await sb.rpc("search_properties", toRpcArgs(s, 1, 0, condoIds) as any);
  if (error) throw error;
  const n = data?.[0]?.total ?? 0;
  if (Number(n) !== legacy) bad++;
  console.log(`| ${label} | ${legacy} | ${n} | ${Number(n) === legacy ? "sim" : "NÃO"} |`);
}
console.log("divergentes:", bad);
if (bad) throw new Error(`${bad} combinações divergentes`);
// Verify purpose-aware ordering across page boundaries, not just one page.
for (const purpose of ["", "sale", "rent"]) {
  let previous: { price_sale: number | null; price_rent: number | null } | null = null;
  let count = 0;
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await sb.rpc("search_properties", toRpcArgs({ ...IMOVEIS_DEFAULTS, purpose }, 100, offset) as any);
    if (error) throw error;
    for (const row of data ?? []) {
      if (previous && compareListingPrice(previous, row, purpose) > 0) throw new Error(`Ordem de preço incorreta: ${purpose || "todas"}, posição ${count}`);
      previous = row;
      count++;
    }
    if ((data ?? []).length < 100) break;
  }
  console.log(`Menor preço antes da paginação: ${purpose || "todas"}, ${count} imóveis OK`);
}
