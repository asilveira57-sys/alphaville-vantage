import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import {
  getFinancingSettings,
  updateFinancingSettings,
  listFinancingSimulations,
} from "@/lib/financing.functions";
import { MoneyInput } from "@/components/ui/money-input";

export const Route = createFileRoute("/_authenticated/admin-financiamento")({
  head: () => ({
    meta: [
      { title: "Simulador de financiamento — Admin S.A. Imóveis" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Configure taxa de juros, prazo e entrada mínima do simulador e acompanhe as simulações registradas." },
      { property: "og:title", content: "Simulador de financiamento — Admin" },
      { property: "og:description", content: "Configurações do simulador e simulações registradas." },
    ],
  }),
  component: AdminFinanciamento,
});

const money = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const inputClass =
  "mt-1 w-full border border-ink/15 px-4 py-3 text-sm bg-transparent focus:outline-none focus:border-ink";
const labelClass = "block text-[10px] uppercase tracking-[0.2em] text-muted-foreground";

function AdminFinanciamento() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["financing-settings"], queryFn: () => getFinancingSettings() });
  const { data: sims } = useQuery({ queryKey: ["financing-simulations"], queryFn: () => listFinancingSimulations() });

  const [rate, setRate] = useState("11.2");
  const [minDown, setMinDown] = useState("10");
  const [maxTerm, setMaxTerm] = useState("420");
  const [fgts, setFgts] = useState("40000");

  useEffect(() => {
    if (!settings) return;
    setRate(String(settings.default_annual_rate));
    setMinDown(String(settings.min_down_payment_pct));
    setMaxTerm(String(settings.max_term_months));
    setFgts(String(settings.fgts_example_amount));
  }, [settings]);

  const save = useMutation({
    mutationFn: () =>
      updateFinancingSettings({
        data: {
          default_annual_rate: Number(rate),
          min_down_payment_pct: Number(minDown),
          max_term_months: Number(maxTerm),
          fgts_example_amount: Number(fgts),
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["financing-settings"] }),
  });

  const leads = (sims ?? []).filter((s) => s.converted_to_lead);

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-12">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Administração</p>
            <h1 className="font-serif text-4xl text-ink">Simulador de financiamento</h1>
          </div>
          <Link
            to="/admin"
            className="border border-ink text-ink px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink hover:text-canvas"
          >
            ← Painel
          </Link>
        </div>

        <section className="border border-ink/10 p-6">
          <h2 className="font-serif text-2xl text-ink mb-6">Parâmetros do simulador</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <label>
              <span className={labelClass}>Taxa anual (% a.a.)</span>
              <input className={inputClass} value={rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" />
            </label>
            <label>
              <span className={labelClass}>Entrada mínima (%)</span>
              <input className={inputClass} value={minDown} onChange={(e) => setMinDown(e.target.value)} inputMode="decimal" />
            </label>
            <label>
              <span className={labelClass}>Prazo máximo (meses)</span>
              <input className={inputClass} value={maxTerm} onChange={(e) => setMaxTerm(e.target.value)} inputMode="numeric" />
            </label>
            <label>
              <span className={labelClass}>FGTS exemplo (R$)</span>
              <MoneyInput
                className={inputClass}
                value={fgtsValue}
                onChange={(v) => setFgts(v == null ? "" : String(v))}
              />
            </label>

          </div>
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="bg-ink text-canvas px-6 py-3 text-xs uppercase tracking-widest font-medium hover:bg-ink/85 disabled:opacity-50"
            >
              {save.isPending ? "Salvando…" : "Salvar parâmetros"}
            </button>
            {save.isSuccess && <span className="text-xs text-emerald-600">Salvo.</span>}
            {save.error && <span className="text-xs text-red-600">{(save.error as Error).message}</span>}
          </div>
        </section>

        <section>
          <div className="flex items-baseline gap-4 mb-4">
            <h2 className="font-serif text-2xl text-ink">Simulações registradas</h2>
            <span className="text-xs text-muted-foreground">
              {(sims ?? []).length} simulações · {leads.length} com contato
            </span>
          </div>
          <div className="overflow-x-auto border border-ink/10">
            <table className="w-full text-sm">
              <thead className="bg-ink/5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Data</th>
                  <th className="text-left px-4 py-3">Imóvel</th>
                  <th className="text-right px-4 py-3">Valor</th>
                  <th className="text-right px-4 py-3">Parcela</th>
                  <th className="text-left px-4 py-3">Contato</th>
                  <th className="text-left px-4 py-3">Prioridade</th>
                </tr>
              </thead>
              <tbody>
                {(sims ?? []).map((s) => (
                  <tr key={s.id} className="border-t border-ink/10">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">{s.property_slug ?? "—"}</td>
                    <td className="px-4 py-3 text-right">{money(Number(s.property_value))}</td>
                    <td className="px-4 py-3 text-right">{money(Number(s.first_installment))}</td>
                    <td className="px-4 py-3">
                      {s.converted_to_lead ? (
                        <span>
                          {s.lead_name} · {s.lead_phone || s.lead_email}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">sem contato</span>
                      )}
                    </td>
                    <td className="px-4 py-3 uppercase text-[11px] tracking-widest">{s.priority_level}</td>
                  </tr>
                ))}
                {(sims ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      Nenhuma simulação registrada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
