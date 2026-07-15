import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { checkIsAdmin } from "@/lib/admin.functions";
import { getStreetsReport, rematchAllProperties } from "@/lib/streets.functions";

export const Route = createFileRoute("/_authenticated/admin-ruas/relatorios")({
  head: () => ({ meta: [{ title: "Admin · Relatórios de Ruas" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: Relatorios,
});

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-ink/10 p-4">
      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
      <div className="font-serif text-3xl text-ink mt-1">{value}</div>
    </div>
  );
}

function Relatorios() {
  const qc = useQueryClient();
  const checkFn = useServerFn(checkIsAdmin);
  const reportFn = useServerFn(getStreetsReport);
  const rematchFn = useServerFn(rematchAllProperties);

  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkFn() });
  const reportQ = useQuery({
    queryKey: ["streets-report"],
    queryFn: () => reportFn(),
    enabled: !!adminQ.data?.isAdmin,
  });

  const rematchMut = useMutation({
    mutationFn: () => rematchFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["streets-report"] }),
  });

  if (adminQ.isLoading) return <SiteLayout><div className="px-6 py-24 text-sm text-muted-foreground">Carregando…</div></SiteLayout>;
  if (!adminQ.data?.isAdmin) return <SiteLayout><div className="px-6 py-24 text-center text-sm text-muted-foreground">Acesso restrito.</div></SiteLayout>;

  const r = reportQ.data;

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-10">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">SEO Local · Relatórios</p>
            <h1 className="font-serif text-4xl text-ink">Ruas — desempenho e cobertura</h1>
          </div>
          <div className="flex gap-3 items-center">
            <button
              onClick={() => rematchMut.mutate()}
              disabled={rematchMut.isPending}
              className="border border-ink/20 px-4 py-2 text-[11px] uppercase tracking-widest hover:bg-ink/5 disabled:opacity-50"
            >
              {rematchMut.isPending ? "Revinculando…" : "Revincular imóveis"}
            </button>
            <Link to="/admin-ruas" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-ink">← Ruas</Link>
          </div>
        </div>

        {rematchMut.data && (
          <div className="border border-emerald-600/30 bg-emerald-50 text-emerald-900 px-4 py-2 text-sm">
            Processados: {rematchMut.data.processed} · Falhas: {rematchMut.data.failed} · Total: {rematchMut.data.total}
          </div>
        )}

        {!r ? (
          <div className="text-sm text-muted-foreground">Carregando relatório…</div>
        ) : (
          <>
            <section>
              <h2 className="font-serif text-lg text-ink mb-4">Cobertura</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Stat label="Ruas cadastradas" value={r.totals.total} />
                <Stat label="Publicadas" value={r.totals.published} />
                <Stat label="Rascunhos" value={r.totals.draft} />
                <Stat label="Arquivadas" value={r.totals.archived} />
                <Stat label="Em destaque" value={r.totals.featured} />
              </div>
            </section>

            <section>
              <h2 className="font-serif text-lg text-ink mb-4">Imóveis ativos</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Total ativos" value={r.properties.total} />
                <Stat label="Vinculados a ruas" value={r.properties.linked} />
                <Stat label="Sem rua identificada" value={r.properties.unlinked} />
                <Stat label="Confiança alta / média / baixa" value={`${r.matchConfidence.high}/${r.matchConfidence.medium}/${r.matchConfidence.low}`} />
              </div>
            </section>

            <section>
              <h2 className="font-serif text-lg text-ink mb-4">Top ruas por imóveis vinculados</h2>
              <div className="border border-ink/10">
                <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-ink/10 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <div className="col-span-6">Rua</div>
                  <div className="col-span-3">Cidade / Bairro</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1 text-right">Imóveis</div>
                </div>
                {r.topStreets.map((row) => (
                  <div key={row.id} className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-ink/8 text-sm items-center">
                    <div className="col-span-6">
                      <Link to="/admin-ruas/$id" params={{ id: row.id }} className="text-ink hover:underline">{row.name}</Link>
                      <div className="text-[11px] text-muted-foreground">/ruas/{row.slug}</div>
                    </div>
                    <div className="col-span-3 text-xs text-muted-foreground">{row.city ?? "—"} · {row.neighborhood ?? "—"}</div>
                    <div className="col-span-2 text-[11px] uppercase tracking-widest">{row.status}</div>
                    <div className="col-span-1 text-right font-medium">{row.property_count}</div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-serif text-lg text-ink mb-4">Páginas publicadas sem imóveis ({r.emptyPublished.length})</h2>
              {r.emptyPublished.length === 0 ? (
                <div className="text-sm text-muted-foreground">Nenhuma página publicada está sem imóveis vinculados.</div>
              ) : (
                <ul className="border border-ink/10 divide-y divide-ink/8">
                  {r.emptyPublished.map((row) => (
                    <li key={row.id} className="px-4 py-2 text-sm flex justify-between">
                      <Link to="/admin-ruas/$id" params={{ id: row.id }} className="text-ink hover:underline">{row.name}</Link>
                      <span className="text-xs text-muted-foreground">{row.city ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="font-serif text-lg text-ink mb-4">Imóveis sem rua identificada ({r.properties.unlinked})</h2>
              {r.unlinkedProperties.length === 0 ? (
                <div className="text-sm text-muted-foreground">Todos os imóveis ativos estão vinculados.</div>
              ) : (
                <div className="border border-ink/10 divide-y divide-ink/8">
                  {r.unlinkedProperties.map((row) => (
                    <div key={row.id} className="px-4 py-2 text-sm">
                      <div className="text-ink">{row.title ?? row.slug ?? row.id}</div>
                      <div className="text-[11px] text-muted-foreground">{row.address ?? "—"} · {row.neighborhood ?? "—"} · {row.city ?? "—"}</div>
                    </div>
                  ))}
                  {r.properties.unlinked > r.unlinkedProperties.length && (
                    <div className="px-4 py-2 text-[11px] text-muted-foreground">Mostrando os primeiros {r.unlinkedProperties.length} de {r.properties.unlinked}.</div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </SiteLayout>
  );
}
