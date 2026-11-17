import { Link } from "@tanstack/react-router";

/** Chips dos pilares editoriais (/temas/{slug}); mostra só pilares com conteúdo publicado. */
export function PillarNav({ items, current, tone = "dark" }: { items: { slug: string; label: string; count: number }[]; current?: string; tone?: "dark" | "light" }) {
  const dark = tone === "dark";
  return (
    <nav aria-label="Temas" className="flex flex-wrap gap-2">
      {items.filter((i) => i.count > 0).map((i) => (
        <Link
          key={i.slug}
          to="/temas/$slug"
          params={{ slug: i.slug }}
          className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] border transition-colors ${
            i.slug === current
              ? "border-gold text-gold"
              : dark ? "border-white/15 text-canvas/70 hover:text-canvas hover:border-gold/60" : "border-ink/15 text-ink/70 hover:text-ink"
          }`}
        >
          {i.label} <span className="opacity-60">({i.count})</span>
        </Link>
      ))}
    </nav>
  );
}
