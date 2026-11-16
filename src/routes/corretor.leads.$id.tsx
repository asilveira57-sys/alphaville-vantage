import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { addLeadNote, claimLead, getStaffLead, LEAD_STAGES, setLeadStage } from "@/lib/corretor.functions";
import { ago, STAGE_STYLE, stageLabel } from "@/components/corretor/stage";
import { useCorretorSession } from "@/components/corretor/session";

export const Route = createFileRoute("/corretor/leads/$id")({
  component: LeadDetail,
});

const digits = (s: string | null) => (s ?? "").replace(/\D/g, "");
const wa = (p: string) => `https://wa.me/${p.startsWith("55") ? p : `55${p}`}`;

function LeadDetail() {
  const { id } = Route.useParams();
  const session = useCorretorSession();
  const qc = useQueryClient();
  const getFn = useServerFn(getStaffLead);
  const claimFn = useServerFn(claimLead);
  const stageFn = useServerFn(setLeadStage);
  const noteFn = useServerFn(addLeadNote);
  const q = useQuery({ queryKey: ["staffLead", id], queryFn: () => getFn({ data: { id } }) });
  const [note, setNote] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["staffLead", id] });
    qc.invalidateQueries({ queryKey: ["staffLeads"] });
  };
  const claim = useMutation({ mutationFn: () => claimFn({ data: { id } }), onSuccess: refresh, onError: refresh });
  const stage = useMutation({ mutationFn: (s: (typeof LEAD_STAGES)[number]["id"]) => stageFn({ data: { id, stage: s } }), onSuccess: refresh });
  const addNote = useMutation({
    mutationFn: () => noteFn({ data: { id, body: note } }),
    onSuccess: () => {
      setNote("");
      refresh();
    },
  });

  if (q.isLoading) return <p className="px-4 py-8 text-sm text-muted-foreground">Carregando…</p>;
  if (q.error) return <p className="px-4 py-8 text-sm text-red-600">{(q.error as Error).message}</p>;
  const { lead, notes, canEdit, isMine } = q.data!;
  const phone = digits(lead.phone);
  const firstName = (lead.name ?? "").split(" ")[0];
  const me = (session.profile?.display_name ?? "").split(" ")[0];
  const waText = `Olá ${firstName}! Aqui é ${me || "a equipe"}, da S.A Imóveis Alphaville. Recebi seu contato pelo nosso portal.`;

  return (
    <div className="px-4 py-5 space-y-6">
      <Link to="/corretor/leads" search={{ aba: isMine ? "meus" : "livres" }} className="text-xs uppercase tracking-widest text-muted-foreground">
        ← Leads
      </Link>

      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-serif text-2xl text-ink">{lead.name || "Sem nome"}</h1>
          <span className={`shrink-0 text-[10px] uppercase tracking-widest px-2 py-0.5 ${STAGE_STYLE[lead.stage] ?? "bg-ink/10"}`}>
            {lead.owner_user_id ? stageLabel(lead.stage) : "Sem dono"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {lead.source_label ?? lead.source} · {ago(lead.created_at)}
          {lead.owner_name && ` · com ${isMine ? "você" : lead.owner_name}`}
        </p>
      </div>

      {!lead.owner_user_id && (
        <div className="bg-[#0D0D0D] text-white p-4">
          <p className="text-sm">Ninguém atendeu este lead ainda.</p>
          <button
            type="button"
            onClick={() => claim.mutate()}
            disabled={claim.isPending}
            className="mt-3 w-full bg-[#F2DA00] text-[#0D0D0D] py-3.5 text-xs uppercase tracking-widest font-semibold disabled:opacity-50"
          >
            {claim.isPending ? "Pegando…" : "Pegar este lead"}
          </button>
          {claim.error && <p className="text-xs text-red-300 mt-2">{(claim.error as Error).message}</p>}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <a
          href={phone ? `${wa(phone)}?text=${encodeURIComponent(waText)}` : undefined}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!phone}
          className={`flex flex-col items-center gap-1 py-3 text-[10px] uppercase tracking-widest ${phone ? "bg-[#25D366] text-white" : "bg-ink/10 text-ink/40 pointer-events-none"}`}
        >
          <MessageCircle className="h-5 w-5" /> WhatsApp
        </a>
        <a
          href={phone ? `tel:+${phone.startsWith("55") ? phone : `55${phone}`}` : undefined}
          aria-disabled={!phone}
          className={`flex flex-col items-center gap-1 py-3 text-[10px] uppercase tracking-widest border ${phone ? "border-ink/20" : "border-ink/10 text-ink/40 pointer-events-none"}`}
        >
          <Phone className="h-5 w-5" /> Ligar
        </a>
        <a
          href={lead.email ? `mailto:${lead.email}` : undefined}
          aria-disabled={!lead.email}
          className={`flex flex-col items-center gap-1 py-3 text-[10px] uppercase tracking-widest border ${lead.email ? "border-ink/20" : "border-ink/10 text-ink/40 pointer-events-none"}`}
        >
          <Mail className="h-5 w-5" /> E-mail
        </a>
      </div>

      <dl className="text-sm space-y-2 border border-ink/10 bg-white/60 p-4">
        {lead.phone && <Row label="Telefone" value={lead.phone} />}
        {lead.email && <Row label="E-mail" value={lead.email} />}
        {lead.summary && <Row label="Interesse" value={lead.summary} />}
        {lead.landing_page && (
          <div>
            <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Página</dt>
            <dd>
              <a href={lead.landing_page} target="_blank" rel="noreferrer" className="underline break-all text-xs">
                {lead.landing_page.replace(/^https?:\/\/[^/]+/, "") || "/"}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {canEdit && lead.owner_user_id && (
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Andamento</h2>
          <div className="grid grid-cols-2 gap-2">
            {LEAD_STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={stage.isPending}
                onClick={() => stage.mutate(s.id)}
                className={`py-3 text-[11px] uppercase tracking-widest border ${
                  lead.stage === s.id ? `${STAGE_STYLE[s.id]} border-transparent` : "border-ink/15 bg-white/60"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {stage.error && <p className="text-xs text-red-600 mt-2">{(stage.error as Error).message}</p>}
        </section>
      )}

      <section>
        <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Anotações</h2>
        {canEdit && lead.owner_user_id && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (note.trim()) addNote.mutate();
            }}
            className="mb-4"
          >
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Ex.: liguei, quer visitar sábado; prefere 3 suítes…"
              className="w-full border border-ink/15 px-3 py-2.5 text-sm bg-white/60 focus:outline-none focus:border-ink"
            />
            <button
              type="submit"
              disabled={addNote.isPending || !note.trim()}
              className="mt-2 bg-ink text-canvas px-4 py-2.5 text-[11px] uppercase tracking-widest font-semibold disabled:opacity-40"
            >
              {addNote.isPending ? "Salvando…" : "Salvar anotação"}
            </button>
            {addNote.error && <p className="text-xs text-red-600 mt-2">{(addNote.error as Error).message}</p>}
          </form>
        )}
        {notes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma anotação.</p>}
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="border-l-2 border-[#F2DA00] bg-white/60 px-3 py-2">
              <p className="text-sm whitespace-pre-line">{n.body}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {n.author} · {new Date(n.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </p>
            </li>
          ))}
        </ul>
        {!canEdit && lead.owner_user_id && <p className="text-xs text-muted-foreground mt-3">Só {lead.owner_name ?? "o corretor responsável"} muda o andamento deste lead.</p>}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}
