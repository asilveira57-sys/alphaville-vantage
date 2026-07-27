import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { resolveImage } from "@/lib/image-fallbacks";

export type CleanPostCardProps = {
  to: string;
  params?: Record<string, string>;
  title: string;
  excerpt?: string | null;
  image?: string | null;
  eyebrow?: string | null;
};

export function CleanPostCard(props: CleanPostCardProps) {
  const src = resolveImage(props.image, { type: "post", seed: props.title });

  return (
    <Link
      to={props.to as never}
      {...(props.params ? { params: props.params as never } : {})}
      className="group flex h-full flex-col overflow-hidden rounded-[16px] bg-[#1D1D1D] ring-1 ring-white/10 shadow-[0_18px_45px_-30px_rgba(0,0,0,0.9)] outline-none transition-all duration-300 hover:-translate-y-1 hover:ring-white/20 focus-visible:ring-2 focus-visible:ring-[#F2DA00]"
    >
      <div className="relative h-[240px] shrink-0 overflow-hidden md:h-[260px]">
        <img
          src={src}
          alt={props.title}
          loading="lazy"
          decoding="async"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="h-full w-full object-cover object-center transition-transform duration-[320ms] ease-out group-hover:scale-[1.04]"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.35)_100%)]"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        {props.eyebrow ? (
          <span className="line-clamp-1 self-start rounded-full bg-[#F2DA00]/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F2DA00]">
            {props.eyebrow}
          </span>
        ) : null}
        <h3 className="font-display line-clamp-3 text-[22px] leading-[1.2] text-[#F5F2EA] text-balance">
          {props.title}
        </h3>
        {props.excerpt ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-[#F5F2EA]/60">{props.excerpt}</p>
        ) : null}
        <span className="mt-auto inline-flex items-center gap-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F5F2EA]/80 transition-colors group-hover:text-[#F2DA00]">
          Ler matéria
          <ArrowUpRight
            className="h-4 w-4 text-[#F2DA00] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            strokeWidth={2.2}
          />
        </span>
      </div>
    </Link>
  );
}
