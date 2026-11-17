/**
 * Proximidades do condomínio (roda no navegador do admin):
 * locais do OpenStreetMap (Overpass) + distância e tempo de carro pelas ruas (OSRM, sem trânsito).
 * Regras de curadoria: prioriza nomes conhecidos (redes, colégios particulares, hospitais grandes)
 * e descarta itens que não interessam a quem procura imóvel (creche municipal, manipulação, consultório…).
 */
import type { CondoNearby } from "./condo-details.functions";

export type Poi = { cat: Cat; name: string; lat: number; lon: number; boost: number };
type Cat = "Escolas" | "Shopping" | "Supermercado" | "Farmácia" | "Hospital" | "Parque";

const PICK: Record<Cat, number> = { Escolas: 4, Shopping: 3, Supermercado: 3, Farmácia: 2, Hospital: 3, Parque: 1 };

const NOTABLE: Partial<Record<Cat, RegExp>> = {
  Escolas: /col[eé]gio|internacional|international|objetivo|anglo|pent[aá]gono|novo tempo|fieb|mackenzie|sabin|leonardo|positivo|graded|sidarta|rio branco|bandeirantes|alphaville|unip|faculdade|universidade/i,
  Supermercado: /p[aã]o de a[cç][uú]car|carrefour|saint marc|st\.? marc|oba|hirota|assa[ií]|extra|sonda|swift|atacad[aã]o|tenda|mambo|dia\b|cobal/i,
  Farmácia: /drogaria s[aã]o paulo|droga raia|drogasil|pague menos|onofre|rani|pacheco/i,
  Hospital: /einstein|s[aã]o luiz|s[ií]rio|municipal|hospital/i,
  Shopping: /shopping|mall|iguatemi/i,
};
const EXCLUDE: Partial<Record<Cat, RegExp>> = {
  Escolas: /infantil|emei|creche|aperfei[cç]oamento|maternal|berç|autoescola|idiomas|cel lep|ballet|nata[cç][aã]o/i,
  Shopping: /bebidas|galeria|outlet de/i,
  Supermercado: /^mini|mercadinho|hortifruti sorriso/i,
  Farmácia: /f[oó]rmulas|manipula|municipal|veterin/i,
  Hospital: /consult[oó]rio|odonto|cl[ií]nica|veterin|^hospitalis$/i,
};

function catOf(t: Record<string, string>): Cat | null {
  const a = t["amenity"], s = t["shop"], l = t["leisure"], n = t["name"] ?? "";
  if (a === "school" || a === "college" || a === "university") return "Escolas";
  if (s === "mall" || (/shopping|mall/i.test(n) && t["building"])) return "Shopping";
  if (s === "supermarket") return "Supermercado";
  if (a === "pharmacy") return "Farmácia";
  if (a === "hospital") return "Hospital";
  if (l === "park" && /^parque/i.test(n)) return "Parque";
  return null;
}

const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

/** Baixa os locais de uma área (bbox sul,oeste,norte,leste). Tenta os 3 servidores do Overpass. */
export async function fetchPois(bbox: [number, number, number, number]): Promise<Poi[]> {
  const b = bbox.join(",");
  const q = `[out:json][timeout:90];(nwr["amenity"~"^(school|university|college|pharmacy|hospital)$"]["name"](${b});nwr["shop"~"^(supermarket|mall)$"]["name"](${b});nwr["name"~"Shopping|Mall",i]["building"](${b});nwr["leisure"="park"]["name"~"^Parque"](${b}););out center tags;`;
  let last = "";
  for (const ep of OVERPASS) {
    try {
      const r = await fetch(ep, { method: "POST", body: "data=" + encodeURIComponent(q) });
      const t = await r.text();
      if (!r.ok || t[0] !== "{") { last = `${ep} ${r.status}`; continue; }
      const els = (JSON.parse(t).elements ?? []) as Array<{ tags: Record<string, string>; lat?: number; lon?: number; center?: { lat: number; lon: number } }>;
      const out: Poi[] = [];
      for (const e of els) {
        const cat = catOf(e.tags);
        const name = e.tags["name"]?.trim();
        const c = e.center ?? (e.lat != null ? { lat: e.lat, lon: e.lon! } : null);
        if (!cat || !name || !c) continue;
        if (EXCLUDE[cat]?.test(name)) continue;
        out.push({ cat, name, lat: c.lat, lon: c.lon, boost: NOTABLE[cat]?.test(name) ? 0.6 : 1 });
      }
      return out;
    } catch (e) { last = `${ep} ${(e as Error).message}`; }
  }
  throw new Error("Overpass indisponível: " + last);
}

const hav = (a: [number, number], b: [number, number]) => {
  const R = 6371, t = Math.PI / 180, dl = (b[0] - a[0]) * t, dn = (b[1] - a[1]) * t;
  const x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin(dn / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

/** Escolhe e mede (OSRM) os locais mais relevantes perto de um ponto. */
export async function computeNearby(lat: number, lng: number, pois: Poi[]): Promise<CondoNearby[]> {
  const O: [number, number] = [lat, lng];
  const cands: Array<Poi & { d: number }> = [];
  (Object.keys(PICK) as Cat[]).forEach((cat) => {
    const seen = new Set<string>();
    pois.filter((p) => p.cat === cat)
      .map((p) => ({ ...p, d: hav(O, [p.lat, p.lon]) }))
      .filter((p) => p.d <= 8)
      .sort((a, b) => a.d * a.boost - b.d * b.boost)
      .forEach((p) => { const k = p.name.toLowerCase(); if (!seen.has(k) && seen.size < PICK[cat] + 3) { seen.add(k); cands.push(p); } });
  });
  if (!cands.length) return [];
  const coords = [[lng, lat], ...cands.map((c) => [c.lon, c.lat])].map((c) => c.join(",")).join(";");
  const r = await fetch(`https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=distance,duration`);
  const j = await r.json();
  if (j.code !== "Ok") throw new Error("OSRM: " + (j.message ?? j.code));
  const measured = cands.map((c, i) => ({ c, km: j.distances[0][i + 1] / 1000, min: j.durations[0][i + 1] / 60 }))
    .filter((m) => m.km > 0 && m.km <= 12);
  const out: CondoNearby[] = [];
  (Object.keys(PICK) as Cat[]).forEach((cat) => {
    measured.filter((m) => m.c.cat === cat)
      .sort((a, b) => a.km * a.c.boost - b.km * b.c.boost)
      .slice(0, PICK[cat])
      .forEach((m) => out.push({ cat, name: m.c.name, km: Math.round(m.km * 10) / 10, min: Math.max(1, Math.round(m.min)) }));
  });
  return out;
}

/** bbox que cobre todos os pontos + 8 km de margem. */
export function bboxFor(points: Array<[number, number]>): [number, number, number, number] {
  const m = 0.075;
  const lats = points.map((p) => p[0]), lngs = points.map((p) => p[1]);
  return [Math.min(...lats) - m, Math.min(...lngs) - m, Math.max(...lats) + m, Math.max(...lngs) + m];
}
