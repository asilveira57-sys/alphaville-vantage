import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { calculateFinancing, type AmortizationSystem } from "@/lib/financing-calc";
import { getFinancingSettings, registerFinancingSimulation, convertSimulationToLead } from "@/lib/financing.functions";

type Props = {
  propertyId?: string;
  propertySlug: string;
  propertyValue: number;
};

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const inputClass =
  "mt-1 w-full rounded-lg border border-black/15 bg-white px-4 py-3 text-sm outline-none focus:border-[#0D0D0D] focus-visible:ring-2 focus-visible:ring-[#F2DA00]";
const labelClass = "block text-[11px] uppercase tracking-[0.18em] font-semibold text-[#1A1A1A]/60";

export function FinancingSimulator({ propertyId, propertySlug, propertyValue }: Props) {
  const { data: settings } = useQuery({
    queryKey: ["financing-settings"],
    queryFn: () => getFinancingSettings(),
    staleTime: 5 * 60_000,
  });

  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [termMonths, setTermMonths] = useState(360);
  const [usedFgts, setUsedFgts] = useState(false);
  const [system, setSystem] = useState<AmortizationSystem>("price");
  const [simulationId, setSimulationId] = useState<string | null>(null);

  const [leadOpen, setLeadOpen] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSent, setLeadSent] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  const annualRate = settings?.default_annual_rate ?? 11.2;
  const fgtsAmount = settings?.fgts_example_amount ?? 40000;

  const result = useMemo(
    () =>
      calculateFinancing({
        propertyValue,
        downPaymentPct,
        usedFgts,
        fgtsAmount,
        termMonths,
        annualRatePct: annualRate,
        system,
      }),
    [propertyValue, downPaymentPct, usedFgts, fgtsAmount, termMonths, annualRate, system],
  );

  // Registra a simulação (sem contato) de forma "silenciosa" quando os
  // parâmetros param de mudar por um instante — dá visibilidade de quais
  // imóveis geram mais simulações, sem exigir nada da pessoa.
  useEffect(() => {
    const t = setTimeout(() => {
      registerFinancingSimulation({
        data: {
          property_id: propertyId,
          property_slug: propertySlug,
          property_value: propertyValue,
          down_payment_pct: downPaymentPct,
          used_fgts: usedFgts,
          fgts_amount: usedFgts ? fgtsAmount : 0,
          term_months: termMonths,
          annual_rate: annualRate,
          amortization_system: system,
          source: "property_page_simulator",
          landing_page: typeof window !== "undefined" ? window.location.pathname : undefined,
          referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
        },
      })
        .then((r) => setSimulationId(r.id))
        .catch(() => {
          /* silencioso: não atrapalha a experiência de simulação */
        });
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downPaymentPct, usedFgts, termMonths, system, annualRate]);

  async function handleLeadSubmit() {
    setLeadError(null);
    if (leadName.trim().length < 2) {
      setLeadError("Informe seu nome.");
      return;
    }
    if (!leadPhone.trim() && !leadEmail.trim()) {
      setLeadError("Informe WhatsApp ou e-mail.");
      return;
    }
    if (!simulationId) {
      setLeadError("Aguarde a simulação terminar de carregar e tente novamente.");
      return;
    }
    try {
      await convertSimulationToLead({
        data: { simulation_id: simulationId, lead_name: leadName, lead_phone: leadPhone, lead_email: leadEmail },
      });
      setLeadSent(true);
    } catch (e) {
      setLeadError(e instanceof Error ? e.message : "Não foi possível enviar agora.");
    }
  }

  return (
    <div className="border border-black/10 bg-white">
      <div className="px-6 py-5 border-b border-black/10 flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-display text-2xl text-[#0D0D0D]">Simule o financiamento deste imóvel</h2>
        <div className="flex border border-black/15 rounded-lg overflow-hidden text-xs font-semibold uppercase tracking-widest">
          <button
            type="button"
            onClick={() => setSystem("price")}
            className={`px-4 py-2 ${system === "price" ? "bg-[#0D0D0D] text-white" : "bg-white text-[#1A1A1A]/60"}`}
          >
            Price
          </button>
          <button
            type="button"
            onClick={() => setSystem("sac")}
            className={`px-4 py-2 border-l border-black/15 ${system === "sac" ? "bg-[#0D0D0D] text-white" : "bg-white text-[#1A1A1A]/60"}`}
          >
            SAC
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 px-6 py-6">
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-baseline">
              <span className={labelClass}>Entrada</span>
              <span className="text-sm font-semibold text-[#0D0D0D]">
                {downPaymentPct}% · {fmt(propertyValue * (downPaymentPct / 100))}
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              value={downPaymentPct}
              onChange={(e) => setDownPaymentPct(Number(e.target.value))}
              className="mt-2 w-full accent-[#0D0D0D]"
            />
          </div>

          <div>
            <div className="flex justify-between items-baseline">
              <span className={labelClass}>Prazo</span>
              <span className="text-sm font-semibold text-[#0D0D0D]">{Math.round(termMonths / 12)} anos</span>
            </div>
            <input
              type="range"
              min={60}
              max={420}
              step={12}
              value={termMonths}
              onChange={(e) => setTermMonths(Number(e.target.value))}
              className="mt-2 w-full accent-[#0D0D0D]"
            />
          </div>

          <label className="flex items-center gap-3 text-sm text-[#1A1A1A]/75">
            <input
              type="checkbox"
              checked={usedFgts}
              onChange={(e) => setUsedFgts(e.target.checked)}
              className="h-4 w-4 accent-[#0D0D0D]"
            />
            Usar FGTS na entrada ({fmt(fgtsAmount)} de exemplo)
          </label>

          <p className="text-[11px] text-[#1A1A1A]/50 leading-relaxed">
            Taxa de referência: {annualRate.toFixed(1).replace(".", ",")}% a.a. Simulação informativa, sujeita à
            aprovação de crédito e às condições da instituição financeira.
          </p>
        </div>

        <div className="bg-[#0D0D0D] text-white p-6 rounded-lg">
          <span className="text-[11px] uppercase tracking-[0.18em] text-white/50">
            {system === "price" ? "Parcela fixa" : "Primeira parcela (SAC, decrescente)"}
          </span>
          <div className="font-display text-4xl mt-1">{fmt(result.firstInstallment)}</div>
          {system === "sac" && (
            <div className="text-sm text-white/60 mt-1">até {fmt(result.lastInstallment)} na última parcela</div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/10 text-sm">
            <div>
              <div className="text-white/50 text-[10px] uppercase tracking-[0.14em]">Valor financiado</div>
              <div className="mt-1">{fmt(result.financedAmount)}</div>
            </div>
            <div>
              <div className="text-white/50 text-[10px] uppercase tracking-[0.14em]">Total de juros</div>
              <div className="mt-1">{fmt(result.totalInterest)}</div>
            </div>
            <div>
              <div className="text-white/50 text-[10px] uppercase tracking-[0.14em]">Renda mínima sugerida</div>
              <div className="mt-1">{fmt(result.suggestedMinIncome)}</div>
            </div>
            <div>
              <div className="text-white/50 text-[10px] uppercase tracking-[0.14em]">Total pago ao fim</div>
              <div className="mt-1">{fmt(result.totalPaid)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 border-t border-black/10 bg-[#F2DA00]/10">
        {!leadOpen && !leadSent && (
          <button
            type="button"
            onClick={() => setLeadOpen(true)}
            className="w-full sm:w-auto bg-[#F2DA00] text-[#0D0D0D] px-6 py-3 text-xs font-bold uppercase tracking-widest hover:brightness-95 transition"
          >
            Receber esta simulação e falar com um corretor
          </button>
        )}

        {leadOpen && !leadSent && (
          <div className="grid sm:grid-cols-3 gap-4 items-end">
            <label>
              <span className={labelClass}>Nome</span>
              <input className={inputClass} value={leadName} onChange={(e) => setLeadName(e.target.value)} />
            </label>
            <label>
              <span className={labelClass}>WhatsApp</span>
              <input
                className={inputClass}
                value={leadPhone}
                inputMode="tel"
                placeholder="(11) 90000-0000"
                onChange={(e) => setLeadPhone(e.target.value)}
              />
            </label>
            <label>
              <span className={labelClass}>E-mail</span>
              <input
                className={inputClass}
                value={leadEmail}
                type="email"
                onChange={(e) => setLeadEmail(e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={handleLeadSubmit}
              className="sm:col-span-3 bg-[#0D0D0D] text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:brightness-110 transition"
            >
              Enviar
            </button>
            {leadError && (
              <p role="alert" className="sm:col-span-3 text-xs text-red-600">
                {leadError}
              </p>
            )}
          </div>
        )}

        {leadSent && (
          <p className="text-sm text-[#1A1A1A]/80">
            Simulação registrada. Um corretor entra em contato com as condições reais deste imóvel.
          </p>
        )}
      </div>
    </div>
  );
}
