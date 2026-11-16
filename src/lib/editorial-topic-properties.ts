import { queryOptions } from "@tanstack/react-query";
import { listCondoProperties } from "@/lib/condo-properties.functions";

/** Autor exibido e declarado no schema dos posts e guias (decisão do Alexandre, 16/11/2026). */
export const EDITORIAL_AUTHOR = "Equipe S.A Imóveis";
export const EDITORIAL_PUBLISHER = "S.A Imóveis Alphaville";

type PageLike = Record<string, unknown> | null | undefined;

/**
 * Bloco de imóveis em posts e guias: só aparece quando a página tem vínculo explícito
 * (condomínio, nomes de condomínio ou imóveis escolhidos no admin). Sem fallback pelo título,
 * para não mostrar imóveis aleatórios em post de tema geral.
 */
export function topicPropsArgs(page: PageLike) {
  const enabled = (page?.["properties_block_enabled"] as boolean | null) !== false;
  const condominiumId = (page?.["related_condominium"] as string | null) ?? null;
  const condoTerms = (page?.["properties_condo_terms"] as string[] | null) ?? [];
  const includedIds = (page?.["properties_included_ids"] as string[] | null) ?? [];
  const excludedIds = (page?.["properties_excluded_ids"] as string[] | null) ?? [];
  const configured = !!condominiumId || condoTerms.length > 0 || includedIds.length > 0;
  return { active: enabled && configured, args: { condominiumId, condoTerms, includedIds, excludedIds, titleFallback: "" } };
}

const EMPTY = { condominiumName: null, items: [], rentItems: [], saleItems: [] };

export const topicPropsQO = (kind: string, slug: string, page: PageLike) => {
  const { active, args } = topicPropsArgs(page);
  return queryOptions({
    queryKey: ["editorial", kind, "topic-properties", slug, args, active],
    queryFn: () => (active ? listCondoProperties({ data: args }) : Promise.resolve(EMPTY)),
  });
};

export function topicBlockTitle(page: PageLike): string {
  const t = (page?.["properties_block_title"] as string | null)?.trim();
  return t || "Imóveis relacionados";
}
