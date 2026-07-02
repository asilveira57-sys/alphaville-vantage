import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { resolveImage, type FallbackKind } from "@/lib/image-fallbacks";
import { cn } from "@/lib/utils";

type BaseProps = {
  image?: string | null;
  imageAlt: string;
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  cta?: string;
  aspectRatio?: "portrait" | "landscape" | "square" | "tall";
  className?: string;
  fallback?: { type?: FallbackKind; region?: string | null; seed?: string | null };
  footer?: ReactNode;
  badges?: ReactNode;
  /** Marks the LCP/above-the-fold card so the browser fetches it eagerly. */
  priority?: boolean;
  /** Responsive `sizes` hint — defaults to a 1/2/3-column grid heuristic. */
  sizes?: string;
};

type LinkedProps = BaseProps & {
  to: LinkProps["to"];
  params?: LinkProps["params"];
  search?: LinkProps["search"];
  href?: never;
};
type AnchorProps = BaseProps & { href: string; to?: never; params?: never; search?: never };

export type PremiumCardProps = LinkedProps | AnchorProps;

const aspects: Record<NonNullable<BaseProps["aspectRatio"]>, string> = {
  portrait: "aspect-[3/4]",
  landscape: "aspect-[16/10]",
  square: "aspect-square",
  tall: "aspect-[4/5]",
};

export function PremiumCard(props: PremiumCardProps) {
  const {
    image, imageAlt, eyebrow, title, description, icon, cta = "Explorar",
    aspectRatio = "tall", className, fallback, footer, badges,
    priority = false,
    sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  } = props;
  const src = resolveImage(image, fallback ?? {});

  const inner = (
    <div
      className={cn(
        "group relative isolate overflow-hidden rounded-2xl bg-navy-deep text-canvas",
        "shadow-premium ring-1 ring-white/5 transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-premium-hover hover:ring-gold/40",
        "focus-within:ring-2 focus-within:ring-gold",
        aspects[aspectRatio],
        className,
      )}
    >
      <img
        src={src}
        alt={imageAlt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        sizes={sizes}
        {...(priority ? { fetchPriority: "high" as const } : { fetchPriority: "low" as const })}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,17,35,0.15)_0%,rgba(10,17,35,0.55)_45%,rgba(8,14,28,0.95)_100%)]"
      />

      {/* Top row: eyebrow badge + icon */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
        {eyebrow ? (
          <span className="inline-flex items-center rounded-full bg-navy/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold ring-1 ring-gold/30 backdrop-blur">
            {eyebrow}
          </span>
        ) : <span />}
        {icon ? (
          <span className="grid h-11 w-11 place-items-center rounded-full bg-gold text-navy-deep shadow-[0_6px_20px_-6px_rgba(203,161,53,0.6)]">
            {icon}
          </span>
        ) : null}
      </div>

      {/* Optional secondary badges (e.g. Venda/Alugar) */}
      {badges ? (
        <div className="absolute left-5 top-16 flex flex-wrap gap-2">{badges}</div>
      ) : null}

      {/* Bottom content */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 md:p-6">
        <h3 className="font-serif text-2xl md:text-3xl leading-[1.1] text-canvas text-balance drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
          {title}
        </h3>
        {description ? (
          <p className="text-sm text-canvas/75 leading-relaxed line-clamp-3 max-w-[46ch]">
            {description}
          </p>
        ) : null}
        {footer ? <div className="pt-1">{footer}</div> : null}
        <div className="mt-2 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gold text-navy-deep transition-transform duration-300 group-hover:translate-x-1">
            <ArrowUpRight className="h-4 w-4" strokeWidth={2.4} />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
            {cta}
          </span>
        </div>
      </div>
    </div>
  );

  if ("href" in props && props.href) {
    return (
      <a href={props.href} target="_blank" rel="noreferrer" className="block outline-none">
        {inner}
      </a>
    );
  }
  const { to, params, search } = props as LinkedProps;
  return (
    <Link
      to={to as never}
      {...(params ? { params: params as never } : {})}
      {...(search ? { search: search as never } : {})}
      className="block outline-none"
    >
      {inner}
    </Link>
  );
}
