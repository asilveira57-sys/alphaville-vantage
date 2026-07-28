import { useState } from "react";
import { Loader2, Check, Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { submitPartnerLead } from "@/lib/partners.functions";

const PLANS = [
  "Apartamento de 239 m²",
  "Apartamento de 244 m²",
  "Penthouse de 362 m²",
  "Duplex de 432 m²",
  "Quero comparar as unidades disponíveis",
];

const BUDGETS = [
  "Até R$ 3 milhões",
  "R$ 3 a 5 milhões",
  "R$ 5 a 8 milhões",
  "Acima de R$ 8 milhões",
  "Prefiro não informar",
];

export function NeoLeadForm() {
  const submit = useServerFn(submitPartnerLead);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    lead_name: "",
    lead_phone: "",
    development: PLANS[0],
    goal: "morar",
    budget: BUDGETS[0],
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      await submit({
        data: {
          ...form,
          partner: "mpd",
          lead_source: "empreendimento_page",
          empreendimento_slug: "neo-alphaville",
          conversion_context: "empreendimento_neo",
          landing_page: typeof window !== "undefined" ? window.location.pathname : "",
        },
      });
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Não foi possível enviar agora.");
    }
  };

  if (status === "done") {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-6 text-white ring-1 ring-white/15">
        <Check className="h-5 w-5 text-[#F2DA00]" />
        <p className="text-sm">Recebemos seu contato. A equipe da S.A. Imóveis retorna em breve.</p>
      </div>
    );
  }

  const field =
    "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#F2DA00]";

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <input
        className={field}
        placeholder="Seu nome"
        required
        maxLength={120}
        value={form.lead_name}
        onChange={set("lead_name")}
      />
      <input
        className={field}
        placeholder="WhatsApp com DDD"
        required
        maxLength={30}
        value={form.lead_phone}
        onChange={set("lead_phone")}
      />
      <select className={field} value={form.development} onChange={set("development")} aria-label="Tipologia de interesse">
        {PLANS.map((d) => (
          <option key={d} value={d} className="text-[#0D0D0D]">{d}</option>
        ))}
      </select>
      <select className={field} value={form.goal} onChange={set("goal")} aria-label="Finalidade">
        <option value="morar" className="text-[#0D0D0D]">Para morar</option>
        <option value="investir" className="text-[#0D0D0D]">Para investir</option>
      </select>
      <select className={`${field} sm:col-span-2`} value={form.budget} onChange={set("budget")} aria-label="Faixa de valor">
        {BUDGETS.map((b) => (
          <option key={b} value={b} className="text-[#0D0D0D]">{b}</option>
        ))}
      </select>

      {error ? <p className="sm:col-span-2 text-sm text-red-300">{error}</p> : null}

      <button
        type="submit"
        disabled={status === "loading"}
        className="sm:col-span-2 inline-flex items-center justify-center gap-2 bg-[#F2DA00] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0D0D0D] transition hover:brightness-95 disabled:opacity-60"
      >
        {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Consultar disponibilidade
      </button>
    </form>
  );
}
