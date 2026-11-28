import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Banknote, Flame, Globe, Home, KeyRound, MapPin, MessageCircle, Radar } from "lucide-react";
import { LOGO_URL } from "@/lib/brand";
import { APP_WHATSAPP_URL, trackApp } from "@/lib/app-cliente";

// Tela inicial do app instalado (start_url do manifesto): só o que leva ao imóvel.
export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "S.A Imóveis Alphaville" },
      { name: "robots", content: "noindex,follow" },
      { name: "theme-color", content: "#0D0D0D" },
    ],
  }),
  component: AppHome,
});

const big = "flex-[2] rounded-2xl flex items-center gap-4 px-6 text-[22px] font-medium active:scale-[0.98] transition-transform";
const mid = "flex-1 rounded-xl flex items-center gap-3 px-5 text-[17px] bg-[#1F1F1D] text-[#F2DA00] active:scale-[0.98] transition-transform";
const small = "rounded-xl flex items-center justify-center gap-2 text-[15px] active:scale-[0.98] transition-transform";

function Btn({ to, search, className, children, name }: { to: string; search?: Record<string, string>; className: string; children: ReactNode; name: string }) {
  return (
    <Link to={to as never} search={search as never} className={className} onClick={() => trackApp("app_botao", { botao: name })}>
      {children}
    </Link>
  );
}

function AppHome() {
  return (
    <div className="h-[100dvh] bg-[#0D0D0D] flex flex-col gap-2.5 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] select-none">
      <div className="flex items-center justify-center py-2">
        <img src={LOGO_URL} alt="S.A Imóveis Alphaville" className="h-9 w-auto" />
      </div>

      <Btn to="/app/buscar" search={{ f: "sale" }} name="comprar" className={`${big} bg-[#F2DA00] text-[#1A1A00]`}>
        <KeyRound className="h-7 w-7" /> Comprar
      </Btn>
      <Btn to="/app/buscar" search={{ f: "rent" }} name="alugar" className={`${big} bg-[#F7E870] text-[#1A1A00]`}>
        <Home className="h-7 w-7" /> Alugar
      </Btn>
      <Btn to="/vender-meu-imovel" name="vender" className={`${big} bg-[#FBF4C2] text-[#1A1A00]`}>
        <Banknote className="h-7 w-7" /> Vender meu imóvel
      </Btn>

      <Btn to="/oportunidades" name="oportunidades" className={mid}>
        <Flame className="h-5 w-5" /> Oportunidades
      </Btn>
      <Btn to="/mapa" name="mapa" className={mid}>
        <MapPin className="h-5 w-5" /> Mapa de imóveis
      </Btn>
      <Btn to="/radar" name="radar" className={mid}>
        <Radar className="h-5 w-5" /> Ativar meu Radar
      </Btn>

      <div className="flex-1 grid grid-cols-2 gap-2.5">
        <a
          href={APP_WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          className={`${small} bg-[#173404] text-[#C0DD97]`}
          onClick={() => trackApp("app_botao", { botao: "whatsapp" })}
        >
          <MessageCircle className="h-5 w-5" /> WhatsApp
        </a>
        <Btn to="/" name="portal" className={`${small} border border-white/20 text-white/70`}>
          <Globe className="h-5 w-5" /> Portal
        </Btn>
      </div>
    </div>
  );
}
