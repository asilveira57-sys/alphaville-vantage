import { residualLocationQuery } from "./property-search";
import type { FilterState } from "@/components/property-filters";
// Versão antiga (no navegador) do filtro de /imoveis — mantida só para o teste de paridade.
export type LegacyRow = { purpose: string | null; property_type: string | null; city: string | null; neighborhood: string | null; region: string | null; condominium_name: string | null; condo_official: string | null; bedrooms: number | null; parking: number | null; parking_covered: number | null; parking_uncovered: number | null; area_useful: number | null; area_built: number | null; area_total: number | null; price_sale: number | null; price_rent: number | null; last_seen_at: string | null; title: string; seo_title: string | null; description: string | null; descricao_seo: string | null };
type PropertyRow = LegacyRow;
export function applyFiltersLegacy(items: PropertyRow[], s: FilterState): PropertyRow[] {
  const norm = (v: string | null | undefined) =>
    (v ?? "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const fuzzyEq = (a: string | null | undefined, b: string) => {
    const na = norm(a);
    const nb = norm(b);
    if (!nb) return true;
    if (!na) return false;
    return na === nb || na.includes(nb) || nb.includes(na);
  };
  let out = items;
  if (s.purpose) {
    out = out.filter((p) => p.purpose === s.purpose || p.purpose === "both" || (s.purpose === "both"));
  }
  if (s.type) out = out.filter((p) => fuzzyEq(p.property_type, s.type));
  if (s.city) out = out.filter((p) => fuzzyEq(p.city, s.city));
  if (s.neighborhood) {
    // O termo pode ser um bairro, uma região ou o nome do condomínio
    // (ex.: "Genesis" é condomínio, não bairro cadastrado).
    out = out.filter(
      (p) =>
        fuzzyEq(p.neighborhood, s.neighborhood) ||
        fuzzyEq(p.region, s.neighborhood) ||
        fuzzyEq(p.condo_official, s.neighborhood) ||
        fuzzyEq(p.condominium_name, s.neighborhood),
    );
  }
  if (s.condo) out = out.filter((p) => fuzzyEq(p.condo_official ?? p.condominium_name, s.condo));
  if (s.bedrooms) out = out.filter((p) => (p.bedrooms ?? 0) >= s.bedrooms);
  if (s.parking) {
    out = out.filter((p) => {
      const t = (p.parking_covered ?? 0) + (p.parking_uncovered ?? 0) || p.parking || 0;
      return t >= s.parking;
    });
  }
  if (s.priceMin || s.priceMax) {
    out = out.filter((p) => {
      const candidates: number[] = [];
      if (s.purpose === "sale") { if (p.price_sale) candidates.push(p.price_sale); }
      else if (s.purpose === "rent") { if (p.price_rent) candidates.push(p.price_rent); }
      else {
        if (p.price_sale) candidates.push(p.price_sale);
        if (p.price_rent) candidates.push(p.price_rent);
      }
      if (!candidates.length) return false;
      const v = Math.min(...candidates);
      if (s.priceMin && v < s.priceMin) return false;
      if (s.priceMax && v > s.priceMax) return false;
      return true;
    });
  }
  if (s.areaMin) {
    out = out.filter((p) => {
      const a = Math.max(p.area_useful ?? 0, p.area_built ?? 0, p.area_total ?? 0);
      return a >= s.areaMin;
    });
  }
  if (s.q) {
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // Sinônimos de logradouro — colapsam para um marcador ignorado
    const STREET_SYNONYMS: Record<string, string> = {
      r: "__log__", rua: "__log__",
      av: "__log__", avenida: "__log__", ave: "__log__",
      al: "__log__", alameda: "__log__",
      tv: "__log__", travessa: "__log__",
      pc: "__log__", pca: "__log__", praca: "__log__",
      rod: "__log__", rodovia: "__log__",
      estr: "__log__", estrada: "__log__",
      lgo: "__log__", largo: "__log__",
      via: "__log__",
    };
    const STOP = new Set(["de", "da", "do", "das", "dos", "e"]);

    const tokenize = (str: string) =>
      normalize(str)
        .split(" ")
        .map((t) => STREET_SYNONYMS[t] ?? t)
        .filter((t) => t && !STOP.has(t) && t !== "__log__");

    // Só sobra o que ainda não virou filtro (normalmente o condomínio/rua).
    // Se nada sobrou, a frase inteira já virou filtro estruturado — não
    // aplicamos busca textual adicional (senão zera o resultado).
    const residual = residualLocationQuery(s.q);
    const queryTokens = residual ? tokenize(residual) : [];

    if (queryTokens.length > 0) {
      // Frase completa, tolerante a conectivos: "residencial 1" casa com
      // "Residencial 1" mas nunca com "Residencial 11".
      const phrase = new RegExp(
        "(^|[^a-z0-9])" +
          queryTokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^a-z0-9]{0,3}") +
          "([^a-z0-9]|$)",
      );
      const condoText = (p: PropertyRow) => normalize([p.condo_official, p.condominium_name].filter(Boolean).join(" "));
      const fullText = (p: PropertyRow) =>
        normalize([p.title, p.condominium_name, p.condo_official, p.neighborhood, p.seo_title, p.city, p.region, p.description, p.descricao_seo].filter(Boolean).join(" "));

      const byCondo = out.filter((p) => phrase.test(condoText(p)));
      if (byCondo.length) {
        out = byCondo;
      } else {
        const byPhrase = out.filter((p) => phrase.test(fullText(p)));
        out = byPhrase.length
          ? byPhrase
          : out.filter((p) => {
              const haystack = tokenize(fullText(p));
              // Números precisam bater exatamente; texto aceita prefixo.
              return queryTokens.every((qt) =>
                haystack.some((ht) =>
                  /^\d+$/.test(qt) ? ht === qt : ht === qt || (qt.length >= 3 && ht.startsWith(qt)),
                ),
              );
            });
      }
    }
  }

  const sorted = [...out];
  if (s.sort === "price_asc") {
    sorted.sort((a, b) => (a.price_sale ?? a.price_rent ?? Infinity) - (b.price_sale ?? b.price_rent ?? Infinity));
  } else if (s.sort === "price_desc") {
    sorted.sort((a, b) => (b.price_sale ?? b.price_rent ?? 0) - (a.price_sale ?? a.price_rent ?? 0));
  } else if (s.sort === "area_desc") {
    sorted.sort((a, b) => {
      const ax = Math.max(a.area_useful ?? 0, a.area_built ?? 0, a.area_total ?? 0);
      const bx = Math.max(b.area_useful ?? 0, b.area_built ?? 0, b.area_total ?? 0);
      return bx - ax;
    });
  } else {
    sorted.sort((a, b) => (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? ""));
  }
  return sorted;
}
