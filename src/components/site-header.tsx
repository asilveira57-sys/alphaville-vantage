import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Phone, MessageCircle, Search, Menu, X } from "lucide-react";
import logoAsset from "@/assets/logo-sa-imoveis-amarela.png.asset.json";

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
  const [open, setOpen] = useState(false);

  return (
    <header className="w-full">
      {/* Faixa fina de contato — fundo preto, acento amarelo */}
      <div className="bg-[#0D0D0D] text-white/70 text-[10px] sm:text-[11px] tracking-[0.18em] uppercase border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 flex items-center justify-between gap-3">
          <span className="hidden sm:inline">S.A Imóveis Alphaville · Corretora oficial da região</span>
          <div className="flex items-center gap-4 sm:gap-5 ml-auto">
            <a href="tel:+5511947888299" className="inline-flex items-center gap-1.5 hover:text-[#F2DA00] transition-colors">
              <Phone className="h-3 w-3 shrink-0" /> (11) 94788-8299
            </a>
            <a
              href="https://wa.me/5511995515053"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-[#F2DA00] transition-colors"
            >
              <MessageCircle className="h-3 w-3 shrink-0" /> WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Barra principal — preta, sticky */}
      <div className="sticky top-0 z-50 bg-[#0D0D0D] text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 lg:h-20 grid grid-cols-[minmax(0,1fr)_auto] lg:flex items-center justify-between gap-4 lg:gap-6">
          <Link to="/" aria-label="S.A Imóveis Alphaville — Início" className="flex min-w-0 items-center gap-3 shrink-0">
            <img
              src={logoAsset.url}
              alt="S.A Imóveis Alphaville"
              width={180}
              height={48}
              className="h-9 lg:h-11 w-auto"
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

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/imoveis"
              aria-label="Pesquisar imóveis"
              className="inline-flex items-center gap-2 bg-[#F2DA00] text-[#0D0D0D] px-3 lg:px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest hover:brightness-95 transition"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Pesquisar imóveis</span>
            </Link>
            <a
              href="https://wa.me/5511995515053"
              target="_blank"
              rel="noreferrer"
              aria-label="Falar no WhatsApp"
              className="lg:hidden inline-flex items-center justify-center border border-white/20 text-white p-2.5 hover:border-[#F2DA00] hover:text-[#F2DA00] transition"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              aria-expanded={open}
              className="lg:hidden inline-flex items-center justify-center border border-white/20 text-white p-2.5 hover:border-[#F2DA00] hover:text-[#F2DA00] transition"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        {open && (
          <nav
            aria-label="Navegação"
            className="lg:hidden border-t border-white/10 bg-[#0D0D0D] max-h-[70svh] overflow-y-auto"
          >
            <div className="px-4 sm:px-6 py-2 divide-y divide-white/10">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="block py-3.5 text-[12px] tracking-[0.2em] uppercase font-medium text-white/85 hover:text-[#F2DA00]"
                  activeProps={{ className: "text-[#F2DA00]" }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
