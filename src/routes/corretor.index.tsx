import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, Users } from "lucide-react";
import { useCorretorSession } from "@/components/corretor/session";
import { AppSetup } from "@/components/corretor/app-setup";
import { listStaffLeads } from "@/lib/corretor.functions";

export const Route = createFileRoute("/corretor/")({
  component: CorretorHome,
});

function CorretorHome() {
  const s = useCorretorSession();
  const leadsFn = useServerFn(listStaffLeads);
  const q = useQuery({ queryKey: ["staffLeads", "livres", ""], queryFn: () => leadsFn({ data: { scope: "livres", q: "" } }) });
  const first = (s.profile?.display_name ?? "").split(" ")[0];
  const counts = q.data?.counts;

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">S.A Imóveis Alphaville</p>
        <h1 className="font-serif text-3xl text-ink mt-1">Olá{first ? `, ${first}` : ""}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/corretor/leads" search={{ aba: "livres" }} className="bg-[#0D0D0D] text-white p-4">
          <div className="text-[10px] uppercase tracking-widest text-white/60">Leads sem dono</div>
          <div className="font-serif text-4xl text-[#F2DA00] mt-1">{counts?.free ?? "—"}</div>
          <div className="text-[11px] text-white/60 mt-1">toque para pegar</div>
        </Link>
        <Link to="/corretor/leads" search={{ aba: "meus" }} className="border border-ink/15 bg-white/60 p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Meus em aberto</div>
          <div className="font-serif text-4xl text-ink mt-1">{counts?.mine ?? "—"}</div>
          <div className="text-[11px] text-muted-foreground mt-1">em atendimento</div>
        </Link>
      </div>

      <div className="grid gap-3">
        <Link to="/corretor/propostas/$id" params={{ id: "nova" }} className="flex items-center gap-3 bg-[#F2DA00] text-[#0D0D0D] px-4 py-4 font-semibold text-sm uppercase tracking-widest">
          <Plus className="h-5 w-5" /> Nova proposta
        </Link>
        <Link to="/corretor/leads" search={{ aba: "meus" }} className="flex items-center gap-3 border border-ink/15 bg-white/60 px-4 py-4 text-sm uppercase tracking-widest">
          <Users className="h-5 w-5" /> Meus leads
        </Link>
        <Link to="/corretor/propostas" className="flex items-center gap-3 border border-ink/15 bg-white/60 px-4 py-4 text-sm uppercase tracking-widest">
          <FileText className="h-5 w-5" /> Propostas enviadas
        </Link>
      </div>

      <AppSetup />
    </div>
  );
}
