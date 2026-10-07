import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Alerta no topo do Admin quando a última verificação diária falhou ou acionou a trava de 80%. */
export function ReconciliationAlert() {
  const { data } = useQuery({
    queryKey: ["reconciliation-last"],
    queryFn: async () => {
      const { data } = await supabase.from("source_reconciliation_runs")
        .select("id,status,error,started_at")
        .order("started_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
  });
  if (!data || data.status === "ok") return null;
  // Execução "rodando" há mais de 30 min = interrompida.
  if (data.status === "running" && Date.now() - new Date(data.started_at).getTime() < 30 * 60_000) return null;
  if (data.status === "running") data.error = "a execução foi interrompida antes de terminar";
  return (
    <div className="border border-destructive bg-destructive/10 text-destructive px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
      <span>
        <b>{data.status === "blocked" ? "Verificação diária travada" : "Verificação diária falhou"}</b>{" "}
        ({new Date(data.started_at).toLocaleString("pt-BR")}): {data.error ?? "erro desconhecido"}
      </span>
      <Link to="/admin-conciliacao" className="underline">Ver conciliação →</Link>
    </div>
  );
}
