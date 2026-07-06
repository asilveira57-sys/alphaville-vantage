import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import {
  getSeoOverview, listIndexableUrls, runSeoAudit,
  purgeSitemapCache, triggerIndexNow, regenerateAndNotify, listSeoRuns,
} from "@/lib/seo.functions";

export const Route = createFileRoute("/_authenticated/admin/seo")({
  head: () => ({
    meta: [
      { title: "SEO — Painel Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminSeoPage,
});

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

function AdminSeoPage() {
  const qc = useQueryClient();
  const overviewFn = useServerFn(getSeoOverview);
  const listFn = useServerFn(listIndexableUrls);
  const auditFn = useServerFn(runSeoAudit);
  const purgeFn = useServerFn(purgeSitemapCache);
  const indexNowFn = useServerFn(triggerIndexNow);
  const regenFn = useServerFn(regenerateAndNotify);
  const runsFn = useServerFn(listSeoRuns);

  const [filterType, setFilterType] = useState<"all" | "institucional" | "imovel" | "blog" | "condominio" | "bairro">("all");
  const [search, setSearch] = useState("");

  const overviewQ = useQuery({ queryKey: ["seo-overview"], queryFn: () => overviewFn() });
  const urlsQ = useQuery({
    queryKey: ["seo-urls", filterType, search],
    queryFn: () => listFn({ data: { type: filterType, search: search || undefined } }),
  });
  const auditQ = useQuery({ queryKey: ["seo-audit"], queryFn: () => auditFn() });
  const runsQ = useQuery({ queryKey: ["seo-runs"], queryFn: () => runsFn() });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["seo-overview"] });
    qc.invalidateQueries({ queryKey: ["seo-runs"] });
  };

  const regenMut = useMutation({ mutationFn: () => regenFn(), onSuccess: invalidate });
  const purgeMut = useMutation({ mutationFn: () => purgeFn(), onSuccess: invalidate });
  const pingAllMut = useMutation({ mutationFn: () => indexNowFn({ data: { all: true } }), onSuccess: invalidate });
  const pingOneMut = useMutation({
    mutationFn: (url: string) => indexNowFn({ data: { urls: [url] } }),
    onSuccess: invalidate,
  });

  const o = overviewQ.data;

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-14">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Administração / SEO</p>
            <h1 className="font-serif text-4xl text-ink">Central de SEO</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Sitemap dinâmico, notificação IndexNow (Bing/Yandex) e auditoria de metadados.
              Cron mensal roda dia 1º às 3h automaticamente.
            </p>
          </div>
          <Link to="/admin" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-ink">← Voltar ao admin</Link>
        </div>

        {/* Overview */}
        <section>
          <h2 className="font-serif text-2xl text-ink mb-4">Visão geral do sitemap</h2>
          {overviewQ.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {o && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                {[
                  ["Total", o.total],
                  ["Institucionais", o.counts.institucional ?? 0],
                  ["Imóveis", o.counts.imovel ?? 0],
                  ["Blog", o.counts.blog ?? 0],
                  ["Condomínios", o.counts.condominio ?? 0],
                  ["Bairros", o.counts.bairro ?? 0],
                ].map(([label, v]) => (
                  <div key={label as string} className="border border-ink/10 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
                    <div className="font-serif text-2xl text-ink">{v as number}</div>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-3 text-xs mb-4">
                <div className="border border-ink/10 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Último refresh do sitemap</div>
                  <div className="text-ink">{fmtDate(o.sitemapPurgedAt)}</div>
                </div>
                <div className="border border-ink/10 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Última notificação IndexNow</div>
                  <div className="text-ink">{fmtDate(o.indexnowLastRunAt)}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => regenMut.mutate()}
                  disabled={regenMut.isPending}
                  className="bg-ink text-canvas px-5 py-3 text-xs uppercase tracking-widest font-medium hover:bg-ink/85 disabled:opacity-50"
                >
                  {regenMut.isPending ? "Regenerando…" : "Regenerar + notificar Bing"}
                </button>
                <button
                  onClick={() => purgeMut.mutate()}
                  disabled={purgeMut.isPending}
                  className="border border-ink/20 text-ink px-5 py-3 text-xs uppercase tracking-widest font-medium hover:bg-ink/5 disabled:opacity-50"
                >
                  {purgeMut.isPending ? "Purgando…" : "Só purgar cache"}
                </button>
                <button
                  onClick={() => pingAllMut.mutate()}
                  disabled={pingAllMut.isPending}
                  className="border border-ink/20 text-ink px-5 py-3 text-xs uppercase tracking-widest font-medium hover:bg-ink/5 disabled:opacity-50"
                >
                  {pingAllMut.isPending ? "Notificando…" : "Só notificar IndexNow"}
                </button>
                <a
                  href={o.sitemapUrl} target="_blank" rel="noreferrer"
                  className="border border-ink/20 text-ink px-5 py-3 text-xs uppercase tracking-widest font-medium hover:bg-ink/5"
                >
                  Abrir sitemap.xml ↗
                </a>
              </div>
              {regenMut.data && (
                <p className="mt-3 text-xs text-emerald-700">
                  ✓ Regenerado. {regenMut.data.total_urls} URLs. IndexNow: HTTP {regenMut.data.indexnow.status}
                  {regenMut.data.indexnow.error ? ` — ${regenMut.data.indexnow.error}` : ""}
                </p>
              )}
            </>
          )}
        </section>

        {/* URLs list */}
        <section>
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-serif text-2xl text-ink">URLs indexáveis</h2>
            <span className="text-xs text-muted-foreground">{urlsQ.data?.length ?? 0} exibidas</span>
          </div>
          <div className="flex gap-2 mb-3 flex-wrap">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="border border-ink/15 px-3 py-2 text-xs bg-transparent"
            >
              <option value="all">Todos os tipos</option>
              <option value="institucional">Institucional</option>
              <option value="imovel">Imóveis</option>
              <option value="blog">Blog</option>
              <option value="condominio">Condomínios</option>
              <option value="bairro">Bairros</option>
            </select>
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por slug…"
              className="border border-ink/15 px-3 py-2 text-xs bg-transparent flex-1 min-w-[200px]"
            />
          </div>
          <div className="border border-ink/10 max-h-[500px] overflow-auto">
            {(urlsQ.data ?? []).slice(0, 500).map((e) => (
              <div key={e.url} className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-ink/8 text-xs items-center">
                <div className="col-span-2 uppercase tracking-wider text-muted-foreground">{e.type}</div>
                <div className="col-span-6 truncate text-ink">{e.path}</div>
                <div className="col-span-2 text-muted-foreground text-[10px]">
                  {e.lastmod ? new Date(e.lastmod).toLocaleDateString("pt-BR") : "—"}
                </div>
                <div className="col-span-2 flex gap-2 justify-end">
                  <a href={e.url} target="_blank" rel="noreferrer" className="text-ink hover:underline">abrir</a>
                  <button
                    onClick={() => pingOneMut.mutate(e.url)}
                    disabled={pingOneMut.isPending}
                    className="text-ink hover:underline disabled:opacity-50"
                  >
                    ping
                  </button>
                </div>
              </div>
            ))}
            {urlsQ.data?.length === 0 && (
              <div className="px-4 py-8 text-sm text-muted-foreground text-center">Nenhuma URL encontrada.</div>
            )}
            {(urlsQ.data?.length ?? 0) > 500 && (
              <div className="px-4 py-3 text-xs text-muted-foreground text-center border-t border-ink/8">
                Mostrando primeiras 500 de {urlsQ.data?.length}. Refine o filtro.
              </div>
            )}
          </div>
        </section>

        {/* Audit */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-serif text-2xl text-ink">Auditoria SEO por página</h2>
            {auditQ.data && (
              <span className="text-xs text-muted-foreground">
                {auditQ.data.errors} erros · {auditQ.data.warnings} avisos
              </span>
            )}
          </div>
          <div className="border border-ink/10 max-h-[500px] overflow-auto">
            {(auditQ.data?.issues ?? []).map((i, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-ink/8 text-xs items-center">
                <div className={`col-span-1 uppercase tracking-wider ${i.severity === "error" ? "text-red-600" : "text-amber-700"}`}>
                  {i.severity === "error" ? "erro" : "aviso"}
                </div>
                <div className="col-span-1 uppercase text-[10px] text-muted-foreground">{i.page_type}</div>
                <div className="col-span-4 truncate text-ink">{i.page_title}</div>
                <div className="col-span-4 text-muted-foreground">{i.message}</div>
                <div className="col-span-2 text-right">
                  <a href={i.edit_url} className="text-ink hover:underline">editar →</a>
                </div>
              </div>
            ))}
            {auditQ.data && auditQ.data.issues.length === 0 && (
              <div className="px-4 py-8 text-sm text-emerald-700 text-center">✓ Nenhum problema encontrado.</div>
            )}
          </div>
        </section>

        {/* Runs */}
        <section>
          <h2 className="font-serif text-2xl text-ink mb-4">Histórico de execuções</h2>
          <div className="border border-ink/10">
            {(runsQ.data ?? []).map((r) => (
              <div key={r.id} className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-ink/8 text-xs items-center">
                <div className="col-span-3 text-muted-foreground">{fmtDate(r.created_at)}</div>
                <div className="col-span-2 uppercase tracking-wider">{r.kind}</div>
                <div className="col-span-2 uppercase text-[10px] text-muted-foreground">{r.triggered_by}</div>
                <div className="col-span-2">{r.urls_count} URLs</div>
                <div className="col-span-1">{r.http_status ?? "—"}</div>
                <div className="col-span-2 truncate text-red-600">{r.error}</div>
              </div>
            ))}
            {runsQ.data?.length === 0 && (
              <div className="px-4 py-8 text-sm text-muted-foreground text-center">Sem execuções ainda.</div>
            )}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
