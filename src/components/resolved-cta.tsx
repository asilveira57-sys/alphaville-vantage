import { useQuery } from "@tanstack/react-query";
import { resolveCta, fillCtaText } from "@/lib/cta.functions";
import { CtaBlockView } from "@/components/cta-block-view";
import { PostCtaBlock } from "@/components/post-cta-block";

type Props = {
  contentType: string;
  /** Chaves de regra da página, da mais específica (ex.: "condominio:residencial"). */
  keys?: string[];
  /** Valores para {chave} no texto e nos links do CTA (ex.: { condominio: "Bellagio" }). */
  vars?: Record<string, string>;
  ctaId?: string | null;
  hidden?: boolean | null;
  /** CTA legado gravado na própria página — tem prioridade máxima. */
  legacy?: {
    title?: string | null;
    text?: string | null;
    buttonLabel?: string | null;
    buttonUrl?: string | null;
  };
  /** Renderiza o CTA padrão do site quando nada for resolvido. */
  fallbackToDefault?: boolean;
};

/**
 * Renderiza o CTA efetivo da página:
 * 1. CTA legado da própria página → 2. CTA escolhido → 3. padrão do tipo → 4. CTA geral.
 */
export function ResolvedCta({ contentType, keys, vars, ctaId, hidden, legacy, fallbackToDefault = true }: Props) {
  const hasLegacy = Boolean(legacy?.title?.trim());

  const { data: cta } = useQuery({
    queryKey: ["cta", "resolve", contentType, keys ?? [], ctaId ?? null, Boolean(hidden)],
    queryFn: () =>
      resolveCta({ data: { ctaId: ctaId ?? null, contentType, keys, hidden: Boolean(hidden) } }),
    enabled: !hidden && !hasLegacy,
    staleTime: 60_000,
  });

  if (hidden) return null;

  if (hasLegacy) {
    return (
      <PostCtaBlock
        title={legacy?.title}
        text={legacy?.text}
        buttonLabel={legacy?.buttonLabel}
        buttonUrl={legacy?.buttonUrl}
      />
    );
  }

  if (cta) {
    return (
      <section className="px-6 py-16 md:py-20 bg-canvas">
        <div className="max-w-4xl mx-auto">
          <CtaBlockView
            title={fillCtaText(cta.title, vars) ?? ""}
            text={fillCtaText(cta.description, vars)}
            buttonLabel={fillCtaText(cta.button_label, vars)}
            buttonUrl={cta.button_url}
            secondaryLabel={fillCtaText(cta.secondary_button_label, vars)}
            secondaryUrl={cta.secondary_button_url}
            variant={cta.variant}
            imageUrl={cta.image_url}
          />
        </div>
      </section>
    );
  }

  return fallbackToDefault ? <PostCtaBlock /> : null;
}
