import { useState } from "react";
import { Loader2, Check, Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { submitPartnerLead } from "@/lib/partners.functions";
import { MPD_EMPREENDIMENTOS_ATIVOS } from "@/lib/empreendimentos-mpd";

const OPTIONS = MPD_EMPREENDIMENTOS_ATIVOS;

const BUDGETS = [
  "Até R$ 1 milhão",
  "R$ 1 a 2 milhões",
  "R$ 2 a 3 milhões",
  "Acima de R$ 3 milhões",
  "Prefiro não informar",
];

export function MpdLeadForm() {
  const submit = useServerFn(submitPartnerLead);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    lead_name: "",
    lead_phone: "",
    empreendimento_slug: OPTIONS[0]?.slug ?? "",
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
      const selected = OPTIONS.find((o) => o.slug === form.empreendimento_slug);
      await submit({
        data: {
          lead_name: form.lead_name,
          lead_phone: form.lead_phone,
          development: selected?.name ?? form.empreendimento_slug,
          goal: form.goal,
          budget: form.budget,
          partner: "mpd",
          lead_source: "partner_page",
          empreendimento_slug: form.empreendimento_slug,
          conversion_context: "partner_mpd",
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
      <select className={field} value={form.development} onChange={set("development")} aria-label="Empreendimento de interesse">
        {DEVELOPMENTS.map((d) => (
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
        Falar com a equipe
      </button>
    </form>
  );
}
