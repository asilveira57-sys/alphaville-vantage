import { PremiumCard } from "@/components/premium-card";

export type PremiumCondoCardProps = {
  slug: string;
  title: string;
  image?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  excerpt?: string | null;
};

export function PremiumCondoCard(p: PremiumCondoCardProps) {
  const eyebrow = p.neighborhood ?? p.city ?? "Condomínio";
  return (
    <PremiumCard
      to={"/condominios/$slug" as never}
      params={{ slug: p.slug } as never}
      image={p.image}
      imageAlt={p.title}
      eyebrow={eyebrow}
      title={p.title}
      description={p.excerpt ?? undefined}
      cta="Ver guia"
      aspectRatio="tall"
      fallback={{ type: "condo", region: p.neighborhood ?? p.city, seed: p.slug }}
    />
  );
}
