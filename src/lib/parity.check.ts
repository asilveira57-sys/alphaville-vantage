import { createClient } from "@supabase/supabase-js";
import { applyFiltersLegacy, type LegacyRow } from "./property-filter-legacy";
import { toRpcArgs, effectiveSearch, IMOVEIS_DEFAULTS, type ImoveisSearch } from "./property-query";
const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!);
const rows: any[] = [];
for (let f = 0; ; f += 1000) {
  const { data, error } = await sb.from("properties").select("purpose,property_type,city,neighborhood,condominium_id,condominium_name,region,bedrooms,parking,parking_covered,parking_uncovered,area_useful,area_built,area_total,price_sale,price_rent,last_seen_at,title,seo_title,description,descricao_seo").eq("status","active").range(f, f+999);
  if (error) throw error; rows.push(...data!); if (data!.length < 1000) break;
}
const { data: condos } = await sb.from("condominiums").select("id,name");
const cm = new Map((condos ?? []).map((c: any) => [c.id, c.name]));
const items: LegacyRow[] = rows.map((r) => ({ ...r, condo_official: cm.get(r.condominium_id) ?? null }));
const cases: [string, Partial<ImoveisSearch>][] = [
  ["sem filtro", {}], ["texto: genesis", { q: "genesis" }], ["texto: tamboré 3", { q: "tamboré 3" }],
  ["texto: casa 4 suítes", { q: "casa 4 suítes" }], ["venda", { purpose: "sale" }], ["locação", { purpose: "rent" }],
  ["venda e locação", { purpose: "both" }], ["venda R$1–3 mi", { purpose: "sale", priceMin: 1_000_000, priceMax: 3_000_000 }],
  ["locação até R$10 mil", { purpose: "rent", priceMax: 10_000 }], ["casa em Santana de Parnaíba", { type: "casa", city: "Santana de Parnaíba" }],
  ["bairro Alphaville + 3 dorm.", { neighborhood: "Alphaville", bedrooms: 3 }], ["apto 2 vagas 80 m²+", { type: "apartamento", parking: 2, areaMin: 80 }],
  ["texto: casa com piscina em santana de parnaiba", { q: "casa com piscina em santana de parnaiba" }],
  ["texto: residencial 1", { q: "residencial 1" }], ["texto: apartamento para alugar até 5 mil", { q: "apartamento para alugar até 5 mil" }],
  ["condomínio Life Park", { condo: "Life Park" }],
];
console.log("| Combinação | Versão atual | Versão nova | Igual |\n|---|---|---|---|");
let bad = 0;
for (const [label, c] of cases) {
  const s = { ...IMOVEIS_DEFAULTS, ...c };
  const legacy = applyFiltersLegacy(items as any, effectiveSearch(s) as any).length;
  const { data, error } = await sb.rpc("search_properties", toRpcArgs(s, 1, 0) as any);
  if (error) throw error;
  const n = data?.[0]?.total ?? 0;
  if (Number(n) !== legacy) bad++;
  console.log(`| ${label} | ${legacy} | ${n} | ${Number(n) === legacy ? "sim" : "NÃO"} |`);
}
console.log("divergentes:", bad);
