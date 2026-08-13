import { Link } from "@tanstack/react-router";
import { Phone, MessageCircle, Search } from "lucide-react";
import logoAsset from "@/assets/logo-sa-imoveis.png.asset.json";

const NAV = [
  { label: "Home", to: "/" },
  { label: "Imóveis", to: "/imoveis" },
  { label: "Alphaville", to: "/alphaville" },
  { label: "Bairros", to: "/bairros" },
  { label: "Condomínios", to: "/condominios" },
  { label: "Guia", to: "/guia" },
  { label: "Ruas", to: "/guia-de-ruas" },
  { label: "Mercado", to: "/mercado-imobiliario" },
  { label: "Blog", to: "/blog" },
] as const;

export function SiteHeader() {
  return (
    <header className="w-full">
      {/* Faixa fina de contato — fundo preto, acento amarelo */}
      <div className="bg-[#0D0D0D] text-white/70 text-[11px] tracking-[0.18em] uppercase border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-1.5 flex items-center justify-between gap-4">
          <span className="hidden sm:inline">S.A Imóveis Alphaville · Corretora oficial da região</span>
          <div className="flex items-center gap-5 ml-auto">
            <a href="tel:+5511947888299" className="inline-flex items-center gap-1.5 hover:text-[#F2DA00] transition-colors">
              <Phone className="h-3 w-3" /> (11) 94788-8299
            </a>
            <a
              href="https://wa.me/5511995515053"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-[#F2DA00] transition-colors"
            >
              <MessageCircle className="h-3 w-3" /> WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Barra principal — preta, sticky */}
      <div className="sticky top-0 z-50 bg-[#0D0D0D] text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-6">
          <Link to="/" aria-label="S.A Imóveis Alphaville — Início" className="flex items-center gap-3 shrink-0">
            <img
              src={logoAsset.url}
              alt="S.A Imóveis Alphaville"
              width={180}
              height={48}
              className="h-11 w-auto brightness-0 invert"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </Link>

          <nav
            aria-label="Navegação principal"
            className="hidden lg:flex items-center gap-7 text-[11px] tracking-[0.18em] uppercase font-medium text-white/85"
          >
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="hover:text-[#F2DA00] transition-colors"
                activeProps={{ className: "text-[#F2DA00]" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link

              to="/imoveis"
              className="inline-flex items-center gap-2 bg-[#F2DA00] text-[#0D0D0D] px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest hover:brightness-95 transition"
            >
              <Search className="h-3.5 w-3.5" /> Pesquisar imóveis
            </Link>
          </div>
        </div>

        {/* Nav mobile */}
        <nav
          aria-label="Navegação"
          className="lg:hidden border-t border-white/10 overflow-x-auto no-scrollbar"
        >
          <div className="flex items-center gap-5 px-6 py-2 text-[10px] tracking-[0.2em] uppercase font-medium text-white/80 whitespace-nowrap">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="hover:text-[#F2DA00]"
                activeProps={{ className: "text-[#F2DA00]" }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
