import { PremiumCard } from "@/components/premium-card";

export type PremiumPostCardProps = {
  to: string;
  params?: Record<string, string>;
  title: string;
  excerpt?: string | null;
  image?: string | null;
  eyebrow?: string | null;
  publishedAt?: string | null;
  readMinutes?: number | null;
  featured?: boolean;
};

function fmtDate(d?: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function PremiumPostCard(props: PremiumPostCardProps) {
  const date = fmtDate(props.publishedAt);
  const footer = (date || props.readMinutes) ? (
    <p className="text-[10px] uppercase tracking-[0.2em] text-canvas/60">
      {[date, props.readMinutes ? `${props.readMinutes} min de leitura` : null].filter(Boolean).join(" · ")}
    </p>
  ) : null;

  return (
    <PremiumCard
      to={props.to as never}
      params={props.params as never}
      image={props.image}
      imageAlt={props.title}
      eyebrow={props.eyebrow ?? "Editorial"}
      title={props.title}
      description={props.excerpt ?? undefined}
      cta="Ler matéria"
      aspectRatio={props.featured ? "landscape" : "tall"}
      fallback={{ type: "post", seed: props.title }}
      footer={footer}
    />
  );
}
