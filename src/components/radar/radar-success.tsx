import { Link } from "@tanstack/react-router";
import { RadarSummary } from "./radar-summary";
import type { PropertySearch } from "@/lib/radar-to-filters";

type Props = {
  items: { label: string; value?: string | null }[];
  onClose: () => void;
  search: PropertySearch;
};

export function RadarSuccess({ items, onClose, search }: Props) {

  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-[0.3em] text-[#1A1A1A]/50">Radar S.A. Imóveis</p>
      <h3 className="mt-3 font-display text-3xl md:text-4xl font-medium text-[#0D0D0D]">
        Seu radar foi ativado
      </h3>
      <p className="mt-4 mx-auto max-w-[56ch] text-sm md:text-base leading-relaxed text-[#1A1A1A]/70">
        Suas preferências foram registradas. A equipe da S.A. Imóveis vai analisar seu perfil e
        selecionar oportunidades compatíveis com seu momento.
      </p>

      <div className="mt-8 rounded-xl border border-black/10 bg-white p-6">
        <RadarSummary items={items} />
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/imoveis"
          onClick={onClose}
          className="inline-flex items-center justify-center bg-[#0D0D0D] text-white px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#0D0D0D]/85"
        >
          Ver imóveis
        </Link>
        <a
          href="https://wa.me/5511995515053"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center bg-[#F2DA00] text-[#0D0D0D] px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] hover:brightness-95"
        >
          Falar com a S.A. Imóveis
        </a>
      </div>
    </div>
  );
}
