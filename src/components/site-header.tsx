import { Link } from "@tanstack/react-router";

const NAV = [
  { label: "Blog", to: "/blog" },
  { label: "Guia Alphaville", to: "/guia-alphaville" },
  { label: "Condomínios", to: "/condominios" },
  { label: "Mercado", to: "/mercado-imobiliario" },
  { label: "Imóveis", to: "/imoveis" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-canvas/85 backdrop-blur-md border-b border-ink/8">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <Link
            to="/"
            className="font-serif text-xl tracking-tighter font-medium text-ink"
            aria-label="S.A Imóveis Alphaville — Início"
          >
            S.A
          </Link>
          <nav
            aria-label="Navegação principal"
            className="hidden md:flex items-center gap-8 text-[11px] tracking-[0.18em] text-muted-foreground uppercase font-medium"
          >
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="hover:text-ink transition-colors"
                activeProps={{ className: "text-ink" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="text-xs font-medium uppercase tracking-widest px-4 py-2 ring-1 ring-ink/10 hover:bg-ink/5 transition-colors"
          >
            Pesquisar
          </button>
        </div>
      </div>
    </header>
  );
}
