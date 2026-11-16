import { LEAD_STAGES } from "@/lib/corretor.functions";

export const stageLabel = (id: string) => LEAD_STAGES.find((s) => s.id === id)?.label ?? id;

export const STAGE_STYLE: Record<string, string> = {
  novo: "bg-[#F2DA00] text-[#0D0D0D]",
  em_atendimento: "bg-sky-700 text-white",
  visita: "bg-violet-700 text-white",
  proposta: "bg-[#25D366] text-white",
  fechado: "bg-emerald-800 text-white",
  perdido: "bg-ink/15 text-ink",
};

export function ago(d: string) {
  const min = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (min < 60) return `há ${Math.max(min, 1)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.round(h / 24);
  return days === 1 ? "ontem" : `há ${days} dias`;
}
