import { cn } from "@/lib/utils";

/**
 * Neutral brand background shown when an item has no real photo.
 * Never replace this with a stock image — the site must not show generic photos.
 */
export function BrandPlaceholder({
  title,
  eyebrow = "S.A Imóveis Alphaville",
  tone = "light",
  className,
}: {
  title: string;
  eyebrow?: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div
      role="img"
      aria-label={title}
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center",
        dark ? "bg-brand-ink-soft text-canvas" : "bg-canvas text-ink",
        className,
      )}
    >
      <span aria-hidden className="h-[2px] w-10 bg-[#F2DA00]" />
      <span className="font-display line-clamp-2 max-w-[22ch] text-xl leading-tight md:text-2xl text-balance">
        {title}
      </span>
      <span
        className={cn(
          "text-[9px] font-semibold uppercase tracking-[0.3em]",
          dark ? "text-canvas/50" : "text-ink/45",
        )}
      >
        {eyebrow}
      </span>
    </div>
  );
}
