import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import {
  listPartnersForAdmin,
  reviewPartner,
  type AdminPartnerRow,
} from "@/lib/partners-area.functions";
import { PARTNER_AGREEMENT_VERSION, hasCreci } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/admin-parceiros")({
  head: () => ({
    meta: [
      { title: "Admin · Parceiros — Portal S.A" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminParceiros,
});

const btn =
  "border border-ink/20 px-3 py-1.5 text-[10px] uppercase tracking-widest hover:bg-ink/5 disabled:opacity-40";
const btnPrimary =
  "bg-brand-yellow text-brand-dark px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:brightness-95 disabled:opacity-40";

const STATUS_LABEL: Record<string, string> = {
  pending: "Em análise",
  approved: "Aprovado",
  rejected: "Recusado",
  revoked: "Revogado",
};

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

function AdminParceiros() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPartnersForAdmin);
  const reviewFn = useServerFn(reviewPartner);

  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");

  const query = useQuery({ queryKey: ["admin", "parceiros"], queryFn: () => listFn({}) });
  const all = useMemo(() => query.data ?? [], [query.data]);

  const rows = useMemo(
    () => (filter === "all" ? all : all.filter((p) => p.status === filter)),
    [all, filter],
  );

  const review = useMutation({
    mutationFn: (vars: { partnerId: string; status: AdminPartnerRow["status"]; notes?: string }) =>
      reviewFn({ data: vars }),
    onSuccess: () => {
      toast.success("Cadastro atualizado.");
      qc.invalidateQueries({ queryKey: ["admin", "parceiros"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-8 border-b border-ink/10 pb-6">
          <Link
            to="/admin"
            className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-ink"
          >
            ← Admin
          </Link>
          <h1 className="font-serif mt-3 text-3xl">Parceiros</h1>
          <p className="mt-2 max-w-[74ch] text-sm text-muted-foreground">
            Corretores com acesso ao mídia kit das oportunidades. Aprovar concede a permissão;
            recusar ou revogar a remove na hora. Confira o CRECI antes de aprovar — quem divulga
            responde junto pela publicidade.
          </p>
        </header>

        {!hasCreci() && (
          <div className="mb-8 border-l-2 border-red-700 bg-red-50 p-5 text-sm text-red-900">
            <strong>CRECI da imobiliária não configurado.</strong> Enquanto o número não for
            preenchido em <code>src/lib/brand.ts</code>, a impressão do mídia kit fica bloqueada
            para todos os parceiros — material publicitário sem registro contraria a Resolução
            COFECI 458/95 art. 2º.
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          {(["pending", "approved", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`px-3 py-1.5 text-[10px] uppercase tracking-widest transition ${
                filter === f ? "bg-ink text-canvas" : "border border-ink/20 hover:bg-ink/5"
              }`}
              onClick={() => setFilter(f)}
            >
              {f === "pending" ? "Em análise" : f === "approved" ? "Aprovados" : "Todos"}
            </button>
          ))}
        </div>

        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : rows.length === 0 ? (
          <p className="border border-ink/10 p-8 text-center text-sm text-muted-foreground">
            Nenhum parceiro neste recorte.
          </p>
        ) : (
          <ul className="divide-y divide-ink/10 border border-ink/10">
            {rows.map((p) => {
              const agreementStale =
                p.status === "approved" && p.agreement_version !== PARTNER_AGREEMENT_VERSION;
              return (
                <li key={p.id} className="flex flex-wrap items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{p.full_name}</span>
                      <span className="border border-ink/20 px-2 py-0.5 text-[9px] uppercase tracking-widest">
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                      {agreementStale ? (
                        <span className="border border-ink/20 px-2 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
                          termo desatualizado
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.creci}
                      {p.company ? ` · ${p.company}` : ""} · {p.phone}
                      {p.email ? ` · ${p.email}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      cadastro em {fmtDate(p.created_at)} · termo {p.agreement_version ?? "—"}{" "}
                      aceito em {fmtDate(p.agreement_accepted_at)} · {p.downloads} acesso(s) ao
                      material
                    </p>
                    {p.review_notes ? (
                      <p className="mt-1 text-xs italic text-muted-foreground">
                        “{p.review_notes}”
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {p.status !== "approved" ? (
                      <button
                        type="button"
                        className={btnPrimary}
                        disabled={review.isPending}
                        onClick={() => review.mutate({ partnerId: p.id, status: "approved" })}
                      >
                        Aprovar
                      </button>
                    ) : null}
                    {p.status === "pending" ? (
                      <button
                        type="button"
                        className={btn}
                        disabled={review.isPending}
                        onClick={() =>
                          review.mutate({
                            partnerId: p.id,
                            status: "rejected",
                            notes: "CRECI não confirmado.",
                          })
                        }
                      >
                        Recusar
                      </button>
                    ) : null}
                    {p.status === "approved" ? (
                      <button
                        type="button"
                        className={btn}
                        disabled={review.isPending}
                        onClick={() => review.mutate({ partnerId: p.id, status: "revoked" })}
                      >
                        Revogar acesso
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SiteLayout>
  );
}
