import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { AdminGate, AdminPageHeader } from "@/components/admin/admin-gate";
import { listScraperRuns } from "@/lib/scraper.functions";

export const Route = createFileRoute("/_authenticated/admin-legado")({
  head: () => ({ meta: [{ title: "Admin · Ferramentas antigas — Portal S.A" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (
    <AdminGate>
      <LegadoPage />
    </AdminGate>
  ),
});

// O crawler antigo lia as páginas do site principal. Hoje os imóveis chegam pela
// sincronização com a API da Univen (Imóveis → Sincronização), então os botões
// que regravavam a base inteira ("Rodar agora", "Reprocessar todos",
// "Regerar SEO (todos)") foram retirados do painel para não desfazer correções.
function LegadoPage() {
  const runsFn = useServerFn(listScraperRuns);
  const runsQ = useQuery({ queryKey: ["scraperRuns"], queryFn: () => runsFn() });

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-6 py-14">
        <AdminPageHeader eyebrow="Sistema" title="Ferramentas antigas" />

        <div className="border border-amber-400/50 bg-amber-50/50 p-5 mb-10 max-w-3xl text-sm text-ink space-y-2">
          <p className="font-medium">O crawler antigo está desligado no painel.</p>
          <p className="text-muted-foreground">
            Os imóveis agora são atualizados de hora em hora pela API da Univen. Os botões que percorriam o site
            principal e regravavam todos os imóveis foram retirados, porque podiam desfazer correções manuais
            (condomínio, finalidade, preço). Para atualizar a base use{" "}
            <Link to="/admin-conciliacao" className="underline">Imóveis → Sincronização</Link>.
          </p>
        </div>

        <h2 className="font-serif text-2xl text-ink mb-4">Histórico do crawler antigo</h2>
        <div className="border border-ink/10">
          {(runsQ.data ?? []).map((r) => (
            <div key={r.id} className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-ink/8 text-xs items-center">
              <div className="col-span-4 text-muted-foreground">{new Date(r.started_at).toLocaleString("pt-BR")}</div>
              <div className="col-span-2 uppercase tracking-wider">{r.status}</div>
              <div className="col-span-2">{r.pages_crawled} pgs</div>
              <div className="col-span-2">{r.properties_upserted} imóveis</div>
              <div className="col-span-2 truncate text-red-600">{r.error}</div>
            </div>
          ))}
          {runsQ.data?.length === 0 && (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">Nenhuma execução registrada.</div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
