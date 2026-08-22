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

/** Media ratio follows the 16/9 editorial cover standard so wide covers are never cropped sideways. */
const aspects: Record<NonNullable<BaseProps["aspectRatio"]>, string> = {
  portrait: "aspect-[16/9]",
  landscape: "aspect-[16/9]",
  square: "aspect-[16/9]",
  tall: "aspect-[16/9]",
};


export const cleanCardShell =
  "group flex h-full flex-col overflow-hidden rounded-[16px] bg-white ring-1 ring-[#0D0D0D]/8 shadow-[0_14px_35px_-28px_rgba(13,13,13,0.6)] outline-none transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_-28px_rgba(13,13,13,0.55)] focus-visible:ring-2 focus-visible:ring-[#F2DA00]";

export function PremiumCard(props: PremiumCardProps) {
  const {
    image, imageAlt, eyebrow, title, description, icon, cta = "Explorar",
    aspectRatio = "tall", className, fallback, footer, badges,
    priority = false,
    sizes = "(max-width: 768px) 88vw, (max-width: 1200px) 45vw, 30vw",
  } = props;
  const src = resolveImage(image, fallback ?? {});

  const inner = (
    <div className={cn(cleanCardShell, className)}>
      <div className={cn("relative shrink-0 overflow-hidden", aspects[aspectRatio])}>
        <img
          src={src}
          alt={imageAlt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          sizes={sizes}
          {...(priority ? { fetchPriority: "high" as const } : { fetchPriority: "low" as const })}
          className="h-full w-full object-cover object-center transition-transform duration-[320ms] ease-out group-hover:scale-[1.04]"
        />
        {eyebrow ? (
          <span className="absolute left-4 top-4 max-w-[85%] truncate rounded-full bg-[#F2DA00] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0D0D0D]">
            {eyebrow}
          </span>
        ) : null}
        {icon ? (
          <span className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#0D0D0D] shadow-sm">
            {icon}
          </span>
        ) : null}
        {badges ? <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">{badges}</div> : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <h3 className="font-display line-clamp-2 min-h-[2.5em] text-[19px] leading-[1.25] text-[#171717] text-balance">
          {title}
        </h3>

        {description ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-[#1A1A1A]/60">{description}</p>
        ) : null}
        {footer ? <div className="pt-1">{footer}</div> : null}
        <span className="mt-auto inline-flex items-center gap-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0D0D0D] transition-colors group-hover:text-[#0D0D0D]/60">
          {cta}
          <ArrowUpRight
            className="h-4 w-4 text-[#0D0D0D] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            strokeWidth={2.2}
          />
        </span>
      </div>
    </div>
  );

  if ("href" in props && props.href) {
    const external = /^https?:\/\//i.test(props.href);
    return (
      <a
        href={props.href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        className="block h-full outline-none"
      >
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
      className="block h-full outline-none"
    >
      {inner}
    </Link>
  );
}
