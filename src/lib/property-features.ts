// Características, estilo e mobília dos imóveis (etiquetas da API Tokko/Univen).
// Usado pela sincronização (gravar) e pela busca/ficha (mostrar e agrupar).

export type TokkoTagSource = {
  tags?: { name?: string; type?: number }[] | null;
  custom_tags?: { group_name?: string; name?: string }[] | null;
};

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
export const featureSlug = (label: string) => fold(label).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Etiquetas que nunca viram característica pública (uso comercial/interno). */
const HIDDEN = new Set([
  "imovel com parceria", "direto com proprietario", "portal destaque", "destaque", "permuta", "aceita permuta",
  "exclusividade", "exclusivo", "placa", "com placa", "financiamento", "aceita financiamento",
].map(fold));
/** Grupos de etiqueta personalizada que não são característica. */
const HIDDEN_GROUPS = new Set(["finalidade", "tipo", "empreendimento", "categoria", "situacao", "andar"].map(fold));

/** Sinônimos: várias etiquetas viram uma característica só. */
const CANON: Record<string, string> = {
  "varanda gourmet": "Varanda gourmet",
  "churrasqueira de varanda": "Varanda gourmet",
  "area gourmet": "Varanda gourmet",
  "terraco gourmet": "Varanda gourmet",
};

/** Mobília: tag da API → valor gravado. */
const FURNISHING: Record<string, string> = {
  "mobiliado": "mobiliado", "mobiliada": "mobiliado",
  "semi-mobiliado": "semi-mobiliado", "semimobiliado": "semi-mobiliado", "semi mobiliado": "semi-mobiliado",
  "semi-mobiliada": "semi-mobiliado", "semi mobiliada": "semi-mobiliado",
  "sem mobilia": "sem-mobilia", "nao mobiliado": "sem-mobilia",
};
export const FURNISHING_LABEL: Record<string, string> = {
  "mobiliado": "Mobiliado", "semi-mobiliado": "Semi-mobiliado", "sem-mobilia": "Sem mobília",
};

/** Estilo: etiqueta personalizada do grupo "Categoria". */
const CATEGORY: [RegExp, string][] = [
  [/^terre[oa]/, "terreo"], [/^sobrado/, "sobrado"], [/^duplex/, "duplex"], [/^triplex/, "triplex"],
  [/^cobertura/, "cobertura"], [/maison|garden/, "garden"], [/^flat|^apart.?hotel|^studio|^stud/, "flat"],
  [/^loft/, "loft"], [/^kitnet|^kitinete/, "kitnet"],
];
export const CATEGORY_LABEL: Record<string, string> = {
  terreo: "Térreo(a)", sobrado: "Sobrado", duplex: "Duplex", triplex: "Triplex", cobertura: "Cobertura",
  garden: "Maison/Garden", flat: "Flat", loft: "Loft", kitnet: "Kitnet",
};

const tidy = (name: string) => {
  const t = name.replace(/\s+/g, " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
};

/**
 * Extrai da API: características (lista ordenada, sem duplicatas), estilo e mobília.
 * Nulo quando a API não traz o dado — a sincronização nunca apaga com vazio.
 */
export function tokkoExtras(p: TokkoTagSource): { features: string[] | null; category: string | null; furnishing: string | null } {
  const out = new Map<string, string>();
  let furnishing: string | null = null;
  let category: string | null = null;
  const take = (raw: string | undefined) => {
    const name = (raw ?? "").trim();
    if (!name) return;
    const k = fold(name);
    if (HIDDEN.has(k)) return;
    if (FURNISHING[k]) { furnishing = FURNISHING[k]; return; }
    const label = CANON[k] ?? tidy(name);
    const slug = featureSlug(label);
    if (slug && !out.has(slug)) out.set(slug, label);
  };
  for (const t of p.tags ?? []) take(t?.name);
  for (const t of p.custom_tags ?? []) {
    const g = fold(t?.group_name ?? "");
    const k = fold(t?.name ?? "");
    if (g === "categoria") {
      const hit = CATEGORY.find(([re]) => re.test(k));
      if (hit && !category) category = hit[1];
      continue;
    }
    if (FURNISHING[k]) { furnishing = FURNISHING[k]; continue; }
    if (HIDDEN_GROUPS.has(g)) continue;
    take(t?.name);
  }
  const features = [...out.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
  return { features: features.length ? features : null, category, furnishing };
}

/** Mobília pela descrição (só para comparar com a etiqueta; não grava). */
export function furnishingFromText(text: string | null | undefined): string | null {
  const t = fold(text ?? "");
  if (!t) return null;
  if (/semi[- ]?mobiliad/.test(t)) return "semi-mobiliado";
  if (/sem mobilia|nao mobiliad|sem moveis/.test(t)) return "sem-mobilia";
  if (/\bmobiliad[oa]s?\b/.test(t)) return "mobiliado";
  return null;
}

// ---- Grupos da tela (filtro e ficha) ----
export type FeatureGroup = "lazer" | "imovel" | "estado";
export const FEATURE_GROUP_LABEL: Record<FeatureGroup, string> = {
  lazer: "Lazer do condomínio", imovel: "Imóvel", estado: "Estado e vista",
};
const LAZER = /piscina|academia|fitness|salao|playground|brinquedoteca|quadra|sauna|spa|espaco gourmet|churrasqueira(?! de varanda)|portaria|seguranca|vigilancia|elevador|gerador|bicicletario|pet|coworking|cinema|jogos|tenis|campo|pista|lago|bosque|clube|area verde|area de lazer|recreacao|hidromassagem coletiva|lavanderia coletiva|mercado|delivery/;
const ESTADO = /vista|reformad|novo|nunca habitad|pronto|andar alto|sol da manha|sol da tarde|ensolarad|ventilad|silencios|esquina|lancamento|em construcao|na planta/;
export function featureGroup(label: string): FeatureGroup {
  const k = fold(label);
  if (k === "varanda gourmet") return "imovel";
  if (ESTADO.test(k)) return "estado";
  if (LAZER.test(k)) return "lazer";
  return "imovel";
}
