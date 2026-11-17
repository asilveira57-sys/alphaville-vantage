import { Link } from "@tanstack/react-router";
import { LISTING_NAV, LISTING_GROUPS } from "@/lib/listing-pages-nav";

/** Bloco de links para as seleções vivas de imóveis (home, posts e guias). */
export function ListingSelections({ title = "Seleções de imóveis em Alphaville", tone = "light" }: { title?: string; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <section className={`px-6 py-14 border-t ${dark ? "bg-[#0D0D0D] text-white border-white/10" : "bg-canvas border-ink/8"}`}>
      <div className="max-w-7xl mx-auto">
        <p className={`text-[10px] uppercase tracking-[0.3em] mb-2 ${dark ? "text-[#F2DA00]" : "text-muted-foreground"}`}>Atualizadas todos os dias</p>
        <h2 className="font-serif text-2xl md:text-3xl mb-8">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {LISTING_GROUPS.map((g) => (
            <div key={g}>
              <h3 className={`text-[11px] uppercase tracking-[0.2em] font-semibold mb-3 ${dark ? "text-white/60" : "text-ink/60"}`}>{g}</h3>
              <ul className="space-y-2 text-sm">
                {LISTING_NAV.filter((i) => i.group === g).map((i) => (
                  <li key={i.slug}>
                    <Link
                      to="/imoveis-alphaville/$slug"
                      params={{ slug: i.slug }}
                      className={dark ? "text-white/85 hover:text-[#F2DA00]" : "text-ink/80 hover:text-ink hover:underline underline-offset-4"}
                    >
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
