import type { ReactNode } from "react";
import { useEmpreendimentoMedia } from "@/components/empreendimentos/gallery-block";

/**
 * Mostra a foto de capa cadastrada no Admin (galeria) na apresentação do empreendimento.
 * Se não houver mídia cadastrada, mantém exatamente o conteúdo de fallback da página.
 */
export function EmpreendimentoCoverImage({
  empreendimentoSlug,
  alt,
  fallback,
}: {
  empreendimentoSlug: string;
  alt: string;
  fallback: ReactNode;
}) {
  const items = useEmpreendimentoMedia(empreendimentoSlug);
  const cover = items?.find((m) => m.is_cover) ?? items?.[0] ?? null;

  if (!cover) return <>{fallback}</>;

  return (
    <img
      src={cover.url}
      alt={cover.alt_text || cover.title || alt}
      loading="lazy"
      decoding="async"
      sizes="(max-width: 768px) 92vw, 55vw"
      className="aspect-[16/10] w-full rounded-[16px] object-cover ring-1 ring-[#0D0D0D]/8"
    />
  );
}
