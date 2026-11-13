import { ReconciliationAlert } from "@/components/admin/reconciliation-alert";
import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site-layout";
import { checkIsAdmin, grantSelfAdminIfFirst } from "@/lib/admin.functions";
import { getScrapAudit, exportPropertiesCsv } from "@/lib/property-review.functions";
import { ADMIN_NAV } from "@/lib/admin-nav";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Portal S.A" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminPage,
});

function AdminPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const checkFn = useServerFn(checkIsAdmin);
  const grantFn = useServerFn(grantSelfAdminIfFirst);
  const auditFn = useServerFn(getScrapAudit);
  const exportFn = useServerFn(exportPropertiesCsv);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkFn() });
  const auditQ = useQuery({
    queryKey: ["scrapAudit"],
    queryFn: () => auditFn(),
    enabled: !!adminQ.data?.isAdmin,
  });
  const grantMut = useMutation({
    mutationFn: () => grantFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["isAdmin"] }),
  });

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const res = await exportFn();
      const day = new Date().toISOString().slice(0, 10);
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `imoveis-portal-${day}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Falha ao exportar imóveis");
    } finally {
      setExporting(false);
    }
  };

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  if (adminQ.isLoading) {
    return <SiteLayout><div className="px-6 py-24 text-sm text-muted-foreground">Carregando…</div></SiteLayout>;
  }

  if (!adminQ.data?.isAdmin) {
    return (
      <SiteLayout>
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">Acesso restrito</p>
          <h1 className="font-serif text-3xl text-ink mb-4">Sem permissão admin</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Se você é o primeiro administrador do portal, conceda-se acesso agora. Se faz parte da equipe,
            peça a um administrador para liberar seu acesso em Sistema → Equipe e acessos.
          </p>
          <button
            onClick={() => grantMut.mutate()}
            disabled={grantMut.isPending}
            className="bg-ink text-canvas px-5 py-3 text-xs uppercase tracking-widest font-medium hover:bg-ink/85 disabled:opacity-50"
          >
            {grantMut.isPending ? "Concedendo…" : "Tornar-me administrador"}
          </button>
          {grantMut.data && !grantMut.data.granted && (
            <p className="mt-4 text-xs text-red-600">{grantMut.data.reason}</p>
          )}
          {grantMut.error && <p className="mt-4 text-xs text-red-600">{(grantMut.error as Error).message}</p>}
          <button onClick={signOut} className="mt-8 block mx-auto text-xs uppercase tracking-widest text-muted-foreground hover:text-ink">
            Sair
          </button>
        </div>
      </SiteLayout>
    );
  }

  const a = auditQ.data;
  const stats: [string, number | undefined, string][] = [
    ["Imóveis na base", a?.total, "/audit"],
    ["Fichas completas", a?.complete, "/audit"],
    ["A revisar", a?.needsReview, "/audit"],
    ["Auditoria com erro", a?.auditError, "/audit"],
  ];

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-6 py-14 space-y-12">
        <ReconciliationAlert />

        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Administração</p>
            <h1 className="font-serif text-4xl text-ink">Painel do portal</h1>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link to="/admin-leads" className="bg-[#F2DA00] text-[#0D0D0D] px-4 py-2 text-xs uppercase tracking-widest font-medium hover:brightness-95">Leads (CRM) →</Link>
            <Link to="/admin-conciliacao" className="border border-ink text-ink px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink hover:text-canvas">Sincronização →</Link>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="border border-ink text-ink px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink hover:text-canvas disabled:opacity-50"
            >
              {exporting ? "Exportando…" : "Exportar imóveis (CSV)"}
            </button>
          </div>
        </div>
        {exportError && <p className="text-xs text-red-600 -mt-8">Erro na exportação: {exportError}</p>}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(([label, value, to]) => (
            <Link key={label} to={to} className="border border-ink/10 px-4 py-3 hover:border-ink/40">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
              <div className="font-serif text-3xl text-ink">{value ?? "—"}</div>
            </Link>
          ))}
        </section>

        <div className="space-y-10">
          {ADMIN_NAV.map((g) => (
            <section key={g.id}>
              <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-3">{g.label}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {g.items.map((i) => (
                  <Link
                    key={i.to}
                    to={i.to}
                    className="group border border-ink/10 bg-white/40 px-4 py-3 hover:border-ink/40 hover:bg-white/70"
                  >
                    <div className="text-sm font-medium text-ink group-hover:underline">{i.label} →</div>
                    <div className="text-xs text-muted-foreground mt-1 leading-snug">{i.description}</div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
