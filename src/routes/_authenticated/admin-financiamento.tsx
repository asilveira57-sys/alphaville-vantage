import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import {
  getFinancingSettings,
  updateFinancingSettings,
  listFinancingSimulations,
  listAllFinancingBanks,
  upsertFinancingBank,
  deleteFinancingBank,
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
  const fgtsValue = fgts === "" || Number.isNaN(Number(fgts)) ? null : Number(fgts);

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

        <BanksSection />



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

// ---------------------------------------------------------------------------
// Cadastro de bancos: taxa média, entrada mínima, prazos e sistemas aceitos.
// ---------------------------------------------------------------------------

type BankForm = {
  id?: string;
  name: string;
  slug: string;
  logo_url: string;
  site_url: string;
  annual_rate: string;
  min_down_payment_pct: string;
  max_financing_pct: string;
  min_term_months: string;
  max_term_months: string;
  allows_price: boolean;
  allows_sac: boolean;
  accepts_fgts: boolean;
  notes: string;
  display_order: string;
  active: boolean;
};

const emptyBank: BankForm = {
  name: "",
  slug: "",
  logo_url: "",
  site_url: "",
  annual_rate: "11.2",
  min_down_payment_pct: "20",
  max_financing_pct: "80",
  min_term_months: "60",
  max_term_months: "420",
  allows_price: true,
  allows_sac: true,
  accepts_fgts: true,
  notes: "",
  display_order: "0",
  active: true,
};

function BanksSection() {
  const qc = useQueryClient();
  const { data: banks } = useQuery({ queryKey: ["financing-banks-admin"], queryFn: () => listAllFinancingBanks() });
  const [form, setForm] = useState<BankForm | null>(null);

  const set = <K extends keyof BankForm>(k: K, v: BankForm[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      await upsertFinancingBank({
        data: {
          id: form.id,
          name: form.name,
          slug: form.slug || form.name,
          logo_url: form.logo_url,
          site_url: form.site_url,
          annual_rate: Number(String(form.annual_rate).replace(",", ".")),
          min_down_payment_pct: Number(String(form.min_down_payment_pct).replace(",", ".")),
          max_financing_pct: Number(String(form.max_financing_pct).replace(",", ".")),
          min_term_months: Number(form.min_term_months),
          max_term_months: Number(form.max_term_months),
          allows_price: form.allows_price,
          allows_sac: form.allows_sac,
          accepts_fgts: form.accepts_fgts,
          notes: form.notes,
          display_order: Number(form.display_order),
          active: form.active,
        },
      });
    },
    onSuccess: () => {
      setForm(null);
      qc.invalidateQueries({ queryKey: ["financing-banks-admin"] });
      qc.invalidateQueries({ queryKey: ["financing-banks"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFinancingBank({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financing-banks-admin"] });
      qc.invalidateQueries({ queryKey: ["financing-banks"] });
    },
  });

  return (
    <section className="border border-ink/10 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h2 className="font-serif text-2xl text-ink">Bancos e taxas</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Taxas médias exibidas no simulador. O visitante escolhe o banco, vê a taxa e pode ajustá-la.
          </p>
        </div>
        <button
          onClick={() => setForm({ ...emptyBank })}
          className="bg-ink text-canvas px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink/85"
        >
          + Novo banco
        </button>
      </div>

      {form && (
        <div className="border border-ink/15 p-5 mb-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <label className="lg:col-span-2">
            <span className={labelClass}>Nome do banco</span>
            <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label>
            <span className={labelClass}>Identificador (slug)</span>
            <input className={inputClass} value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="itau" />
          </label>
          <label>
            <span className={labelClass}>Ordem</span>
            <input className={inputClass} value={form.display_order} onChange={(e) => set("display_order", e.target.value)} inputMode="numeric" />
          </label>
          <label className="lg:col-span-2">
            <span className={labelClass}>Logomarca (URL)</span>
            <input className={inputClass} value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://…" />
          </label>
          <label className="lg:col-span-2">
            <span className={labelClass}>Site do banco</span>
            <input className={inputClass} value={form.site_url} onChange={(e) => set("site_url", e.target.value)} placeholder="https://…" />
          </label>
          <label>
            <span className={labelClass}>Taxa anual média (% a.a.)</span>
            <input className={inputClass} value={form.annual_rate} onChange={(e) => set("annual_rate", e.target.value)} inputMode="decimal" />
          </label>
          <label>
            <span className={labelClass}>Entrada mínima (%)</span>
            <input className={inputClass} value={form.min_down_payment_pct} onChange={(e) => set("min_down_payment_pct", e.target.value)} inputMode="decimal" />
          </label>
          <label>
            <span className={labelClass}>Financia até (%)</span>
            <input className={inputClass} value={form.max_financing_pct} onChange={(e) => set("max_financing_pct", e.target.value)} inputMode="decimal" />
          </label>
          <label>
            <span className={labelClass}>Prazo mínimo (meses)</span>
            <input className={inputClass} value={form.min_term_months} onChange={(e) => set("min_term_months", e.target.value)} inputMode="numeric" />
          </label>
          <label>
            <span className={labelClass}>Prazo máximo (meses)</span>
            <input className={inputClass} value={form.max_term_months} onChange={(e) => set("max_term_months", e.target.value)} inputMode="numeric" />
          </label>
          <div className="flex flex-wrap items-center gap-5 lg:col-span-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.allows_price} onChange={(e) => set("allows_price", e.target.checked)} />
              Tabela Price
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.allows_sac} onChange={(e) => set("allows_sac", e.target.checked)} />
              SAC
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.accepts_fgts} onChange={(e) => set("accepts_fgts", e.target.checked)} />
              Aceita FGTS
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
              Ativo no simulador
            </label>
          </div>
          <label className="sm:col-span-2 lg:col-span-4">
            <span className={labelClass}>Observações exibidas ao visitante</span>
            <textarea className={`${inputClass} min-h-20`} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </label>
          <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-4">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="bg-ink text-canvas px-6 py-3 text-xs uppercase tracking-widest font-medium hover:bg-ink/85 disabled:opacity-50"
            >
              {save.isPending ? "Salvando…" : "Salvar banco"}
            </button>
            <button onClick={() => setForm(null)} className="text-xs uppercase tracking-widest text-muted-foreground">
              Cancelar
            </button>
            {save.error && <span className="text-xs text-red-600">{(save.error as Error).message}</span>}
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-ink/10">
        <table className="w-full text-sm">
          <thead className="bg-ink/5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Banco</th>
              <th className="text-right px-4 py-3">Taxa a.a.</th>
              <th className="text-right px-4 py-3">Entrada mín.</th>
              <th className="text-left px-4 py-3">Prazo</th>
              <th className="text-left px-4 py-3">Sistemas</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(banks ?? []).map((b) => (
              <tr key={b.id} className="border-t border-ink/10">
                <td className="px-4 py-3 flex items-center gap-3">
                  {b.logo_url ? <img src={b.logo_url} alt={b.name} className="h-6 w-auto object-contain" /> : null}
                  {b.name}
                </td>
                <td className="px-4 py-3 text-right">{Number(b.annual_rate).toFixed(2).replace(".", ",")}%</td>
                <td className="px-4 py-3 text-right">{Number(b.min_down_payment_pct).toFixed(0)}%</td>
                <td className="px-4 py-3">
                  {Math.round(b.min_term_months / 12)}–{Math.round(b.max_term_months / 12)} anos
                </td>
                <td className="px-4 py-3">
                  {[b.allows_price ? "Price" : null, b.allows_sac ? "SAC" : null].filter(Boolean).join(" · ") || "—"}
                  {b.accepts_fgts ? " · FGTS" : ""}
                </td>
                <td className="px-4 py-3 text-[11px] uppercase tracking-widest">{b.active ? "Ativo" : "Inativo"}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    className="text-xs uppercase tracking-widest underline mr-4"
                    onClick={() =>
                      setForm({
                        id: b.id,
                        name: b.name,
                        slug: b.slug,
                        logo_url: b.logo_url ?? "",
                        site_url: b.site_url ?? "",
                        annual_rate: String(b.annual_rate),
                        min_down_payment_pct: String(b.min_down_payment_pct),
                        max_financing_pct: String(b.max_financing_pct),
                        min_term_months: String(b.min_term_months),
                        max_term_months: String(b.max_term_months),
                        allows_price: b.allows_price,
                        allows_sac: b.allows_sac,
                        accepts_fgts: b.accepts_fgts,
                        notes: b.notes ?? "",
                        display_order: String(b.display_order),
                        active: b.active,
                      })
                    }
                  >
                    Editar
                  </button>
                  <button
                    className="text-xs uppercase tracking-widest underline text-red-600"
                    onClick={() => {
                      if (confirm(`Excluir ${b.name}?`)) remove.mutate(b.id);
                    }}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {(banks ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  Nenhum banco cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
