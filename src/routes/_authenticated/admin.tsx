import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site-layout";
import { checkIsAdmin, grantSelfAdminIfFirst } from "@/lib/admin.functions";
import { generatePostWithAI } from "@/lib/blog.functions";
import { listEditorialPages } from "@/lib/editorial.functions";
import { runScraper, listScraperRuns } from "@/lib/scraper.functions";
import { reprocessProperties, getScrapAudit } from "@/lib/property-review.functions";
import { regenerateSeo } from "@/lib/property-seo.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Portal S.A" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminPage,
});

function AdminPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const checkFn = useServerFn(checkIsAdmin);
  const grantFn = useServerFn(grantSelfAdminIfFirst);
  const postsFn = useServerFn(listEditorialPages);
  const runsFn = useServerFn(listScraperRuns);
  const genFn = useServerFn(generatePostWithAI);
  const scrapeFn = useServerFn(runScraper);
  const reprocessFn = useServerFn(reprocessProperties);
  const auditFn = useServerFn(getScrapAudit);
  const seoFn = useServerFn(regenerateSeo);
  const [seoUseAI, setSeoUseAI] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsSearch, setPostsSearch] = useState("");
  const POSTS_PAGE_SIZE = 30;

  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkFn() });
  const postsQ = useQuery({
    queryKey: ["adminPosts"], queryFn: () => postsFn({ data: { contentType: "blog" } }),
    enabled: !!adminQ.data?.isAdmin,
  });
  const runsQ = useQuery({
    queryKey: ["scraperRuns"], queryFn: () => runsFn(),
    enabled: !!adminQ.data?.isAdmin,
  });

  const grantMut = useMutation({
    mutationFn: () => grantFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["isAdmin"] }),
  });

  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("");
  const genMut = useMutation({
    mutationFn: () => genFn({ data: { topic, category: category || undefined } }),
    onSuccess: (res) => {
      setTopic("");
      qc.invalidateQueries({ queryKey: ["adminPosts"] });
      if (res?.post?.id) router.navigate({ to: "/cms/$id", params: { id: res.post.id } });
    },
  });
  const [scrapeProgress, setScrapeProgress] = useState<{ batches: number; upserted: number; pages: number; remaining: number } | null>(null);
  const scrapeMut = useMutation({
    mutationFn: async () => {
      const sinceIso = new Date().toISOString();
      const totals = { pages: 0, upserted: 0, discovered: 0, errors: 0, batches: 0 };
      const MAX_BATCHES = 200;
      setScrapeProgress({ batches: 0, upserted: 0, pages: 0, remaining: 0 });
      for (let i = 0; i < MAX_BATCHES; i++) {
        const batch = await scrapeFn({ data: { dryRun: false, limit: 15, useAI: seoUseAI, sinceIso } });
        totals.pages += batch.pages;
        totals.upserted += batch.upserted;
        totals.discovered = batch.discovered;
        totals.errors += batch.errors;
        totals.batches += 1;
        setScrapeProgress({ batches: totals.batches, upserted: totals.upserted, pages: totals.pages, remaining: batch.remaining ?? 0 });
        qc.invalidateQueries({ queryKey: ["scraperRuns"] });
        if (!batch.hasMore) break;
      }
      const seo = await seoFn({ data: { all: true, useAI: seoUseAI } });
      return { scrape: totals, seo };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scraperRuns"] });
      qc.invalidateQueries({ queryKey: ["scrapAudit"] });
    },
  });
  const dryRunMut = useMutation({
    mutationFn: () => scrapeFn({ data: { dryRun: true, limit: 10 } }),
  });

  const reprocessMut = useMutation({
    mutationFn: () => reprocessFn({ data: { all: true } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scrapAudit"] }),
  });
  const seoMut = useMutation({
    mutationFn: () => seoFn({ data: { all: true, useAI: seoUseAI } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scrapAudit"] }),
  });
  const auditQ = useQuery({
    queryKey: ["scrapAudit"],
    queryFn: () => auditFn(),
    enabled: !!adminQ.data?.isAdmin,
  });

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
            Se você é o primeiro administrador do portal, conceda-se acesso agora.
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

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-16">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Administração</p>
            <h1 className="font-serif text-4xl text-ink">Painel editorial</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/cms" className="bg-ink text-canvas px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink/85">CMS Editorial →</Link>
            <Link to="/admin-seo" className="border border-ink text-ink px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink hover:text-canvas">Central SEO →</Link>
            <Link to="/admin-ruas" className="border border-ink text-ink px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink hover:text-canvas">Ruas →</Link>
            <Link to="/admin-radar" className="border border-ink text-ink px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink hover:text-canvas">Radar →</Link>
            <Link to="/admin-empreendimentos" className="border border-ink text-ink px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink hover:text-canvas">Empreendimentos →</Link>
            <Link to="/admin-midia" className="border border-ink text-ink px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink hover:text-canvas">Mídia →</Link>
            <Link to="/admin-auditoria" className="border border-ink text-ink px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink hover:text-canvas">Auditoria →</Link>
            <Link to="/admin-mapa" className="bg-ink text-canvas px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink/85">Mapa do sistema →</Link>



            <button onClick={signOut} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-ink">Sair</button>
          </div>
        </div>

        <section>
          <h2 className="font-serif text-2xl text-ink mb-4">Gerar artigo com IA</h2>
          <div className="space-y-3 max-w-2xl">
            <input
              value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder='Ex.: "Como nasceu Alphaville e o legado de Yojiro Takaoka"'
              className="w-full border border-ink/15 px-4 py-3 text-sm bg-transparent focus:outline-none focus:border-ink"
            />
            <input
              value={category} onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoria (opcional): História, Mercado, Condomínios…"
              className="w-full border border-ink/15 px-4 py-3 text-sm bg-transparent focus:outline-none focus:border-ink"
            />
            <button
              disabled={!topic || genMut.isPending}
              onClick={() => genMut.mutate()}
              className="bg-ink text-canvas px-5 py-3 text-xs uppercase tracking-widest font-medium hover:bg-ink/85 disabled:opacity-50"
            >
              {genMut.isPending ? "Gerando…" : "Gerar rascunho"}
            </button>
            {genMut.error && <p className="text-xs text-red-600">{(genMut.error as Error).message}</p>}
            {genMut.data && <p className="text-xs text-emerald-700">Rascunho criado: {genMut.data.post.title}</p>}
          </div>
        </section>

        <section>
          {(() => {
            const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const q = norm(postsSearch.trim());
            const allPosts = (postsQ.data ?? []).filter((p) => {
              if (!q) return true;
              return norm(p.title ?? "").includes(q) || norm(p.slug ?? "").includes(q);
            });
            const totalPages = Math.max(1, Math.ceil(allPosts.length / POSTS_PAGE_SIZE));
            const currentPage = Math.min(postsPage, totalPages);
            const startIdx = (currentPage - 1) * POSTS_PAGE_SIZE;
            const pagePosts = allPosts.slice(startIdx, startIdx + POSTS_PAGE_SIZE);
            return (
              <>
                <div className="flex items-baseline justify-between mb-4 gap-4 flex-wrap">
                  <h2 className="font-serif text-2xl text-ink">Posts</h2>
                  <input
                    value={postsSearch}
                    onChange={(e) => { setPostsSearch(e.target.value); setPostsPage(1); }}
                    placeholder="Buscar por título ou slug (ex.: coworking, hospital)…"
                    className="flex-1 min-w-[240px] max-w-md border border-ink/15 px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-ink"
                  />
                  <span className="text-xs text-muted-foreground">
                    {allPosts.length} resultado(s) · pág. {currentPage}/{totalPages}
                  </span>
                </div>
                <div className="border border-ink/10">
                  {pagePosts.map((p) => (
                    <div key={p.id} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-ink/8 text-sm items-center">
                      <div className="col-span-6 font-medium text-ink truncate">
                        <Link to="/cms/$id" params={{ id: p.id }} className="hover:underline">{p.title}</Link>
                      </div>
                      <div className="col-span-2 text-xs uppercase tracking-wider text-muted-foreground">{p.status}</div>
                      <div className="col-span-2 text-xs text-muted-foreground truncate">/{p.slug}</div>
                      <div className="col-span-2 text-right">
                        <Link to="/cms/$id" params={{ id: p.id }} className="text-xs uppercase tracking-widest text-ink hover:underline">Editar</Link>
                      </div>
                    </div>
                  ))}
                  {allPosts.length === 0 && (
                    <div className="px-4 py-8 text-sm text-muted-foreground text-center">Nenhum post ainda.</div>
                  )}
                </div>
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPostsPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-xs uppercase tracking-widest border border-ink/15 disabled:opacity-30 hover:bg-ink/5"
                    >
                      Anterior
                    </button>
                    <span className="text-xs text-muted-foreground px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPostsPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-xs uppercase tracking-widest border border-ink/15 disabled:opacity-30 hover:bg-ink/5"
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </section>

        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-serif text-2xl text-ink">Crawler de imóveis</h2>
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground mr-2">
                <input type="checkbox" checked={seoUseAI} onChange={(e) => setSeoUseAI(e.target.checked)} />
                IA na abertura
              </label>
              <button
                onClick={() => seoMut.mutate()}
                disabled={seoMut.isPending}
                className="border border-ink/20 text-ink px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink/5 disabled:opacity-50"
              >
                {seoMut.isPending ? "Regerando…" : "Regerar SEO (todos)"}
              </button>
              <button
                onClick={() => reprocessMut.mutate()}
                disabled={reprocessMut.isPending}
                className="border border-ink/20 text-ink px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink/5 disabled:opacity-50"
              >
                {reprocessMut.isPending ? "Reprocessando…" : "Reprocessar todos"}
              </button>
              <button
                onClick={() => dryRunMut.mutate()}
                disabled={dryRunMut.isPending || scrapeMut.isPending}
                className="border border-ink/20 text-ink px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink/5 disabled:opacity-50"
                title="Coleta as próximas URLs e mostra como seriam cadastradas, sem gravar nada."
              >
                {dryRunMut.isPending ? "Simulando…" : "Simular (dry-run)"}
              </button>
              <button
                onClick={() => scrapeMut.mutate()}
                disabled={scrapeMut.isPending}
                className="bg-ink text-canvas px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink/85 disabled:opacity-50"
              >
                {scrapeMut.isPending
                  ? (scrapeProgress
                      ? `Lote ${scrapeProgress.batches} · ${scrapeProgress.upserted} imóveis · ${scrapeProgress.remaining} restantes`
                      : "Rodando…")
                  : "Rodar agora"}
              </button>

            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            "Rodar agora" percorre TODOS os imóveis do site de origem em lotes de 15, gravando lote a lote até esgotar a fila, e ao final reaplica o motor SEO em toda a base. Marque "IA na abertura" para usar IA no 1º parágrafo (tanto na coleta quanto na regeração). "Reprocessar todos" reaplica as regras do parser e da auditoria preservando overrides manuais.
          </p>
          {auditQ.data && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4 text-xs">
              {[
                ["Total", auditQ.data.total],
                ["Completos", auditQ.data.complete],
                ["Revisar", auditQ.data.needsReview],
                ["✓ Audit OK", auditQ.data.auditOk],
                ["⚠ Audit revisar", auditQ.data.auditReview],
                ["✗ Audit erro", auditQ.data.auditError],
              ].map(([label, value]) => (
                <div key={label as string} className="border border-ink/10 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
                  <div className="font-serif text-2xl text-ink">{value as number}</div>
                </div>
              ))}
              <Link to="/audit" className="border border-ink px-3 py-2 flex items-center justify-center text-xs uppercase tracking-widest hover:bg-ink hover:text-canvas">
                Abrir auditoria →
              </Link>
            </div>
          )}
          {scrapeMut.error && <p className="text-xs text-red-600 mb-3">{(scrapeMut.error as Error).message}</p>}
          {scrapeMut.isPending && scrapeProgress && (
            <p className="text-xs text-muted-foreground mb-3">
              Lote {scrapeProgress.batches} concluído · {scrapeProgress.upserted} imóveis gravados · {scrapeProgress.pages} páginas visitadas · {scrapeProgress.remaining} restantes na fila.
            </p>
          )}
          {scrapeMut.data && (
            <p className="text-xs text-emerald-700 mb-3">
              {scrapeMut.data.scrape.batches} lote(s) · Páginas: {scrapeMut.data.scrape.pages} · Imóveis upsertados: {scrapeMut.data.scrape.upserted} · Descobertos: {scrapeMut.data.scrape.discovered} · SEO regerado: {scrapeMut.data.seo.updated}/{scrapeMut.data.seo.processed}
            </p>
          )}
          {reprocessMut.error && <p className="text-xs text-red-600 mb-3">{(reprocessMut.error as Error).message}</p>}
          {reprocessMut.data && (
            <p className="text-xs text-emerald-700 mb-3">
              Reprocessados: {reprocessMut.data.processed} · Atualizados: {reprocessMut.data.updated}
            </p>
          )}
          {seoMut.error && <p className="text-xs text-red-600 mb-3">{(seoMut.error as Error).message}</p>}
          {seoMut.data && (
            <p className="text-xs text-emerald-700 mb-3">
              SEO regerado: {seoMut.data.processed} · Atualizados: {seoMut.data.updated} · IA: {seoMut.data.withAI ? "sim" : "não"}
            </p>
          )}
          {dryRunMut.error && <p className="text-xs text-red-600 mb-3">{(dryRunMut.error as Error).message}</p>}

          {dryRunMut.data && (
            <div className="border border-amber-400/40 bg-amber-50/40 p-4 mb-4">
              <p className="text-xs uppercase tracking-widest text-amber-900 mb-2">
                Simulação · {dryRunMut.data.previews.length} URLs analisadas · Descobertos: {dryRunMut.data.discovered} · Nada foi gravado
              </p>
              <div className="space-y-2 max-h-96 overflow-auto">
                {dryRunMut.data.previews.map((p) => (
                  <div key={p.ref} className="text-xs border-b border-amber-900/10 pb-2">
                    <div className="font-medium text-ink truncate">{p.title}</div>
                    <div className="text-muted-foreground truncate">{p.url}</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      <span>{p.property_type ?? "—"} · {p.purpose ?? "—"}</span>
                      <span>{p.neighborhood ?? "—"}{p.city ? `, ${p.city}` : ""}</span>
                      {p.condominium_name && <span>🏢 {p.condominium_name}</span>}
                      {p.bedrooms != null && <span>{p.bedrooms} dorm</span>}
                      {p.area != null && <span>{p.area} m²</span>}
                      {p.price_sale != null && <span>venda R$ {p.price_sale.toLocaleString("pt-BR")}</span>}
                      {p.price_rent != null && <span>aluguel R$ {p.price_rent.toLocaleString("pt-BR")}</span>}
                      <span>{p.images_count} fotos</span>
                      <span className={p.existing ? "text-muted-foreground" : "text-emerald-700"}>
                        {p.existing ? "já cadastrado" : "novo"}
                      </span>
                      {p.would_create_bairro_guia && <span className="text-blue-700">+ guia bairro</span>}
                      {p.would_create_condominio && <span className="text-blue-700">+ condomínio</span>}
                      <span className={
                        p.audit_status === "ok" ? "text-emerald-700"
                          : p.audit_status === "review" ? "text-amber-700" : "text-red-600"
                      }>audit: {p.audit_status}</span>
                    </div>
                    {(p.warnings.length > 0 || p.audit_issues.length > 0) && (
                      <div className="text-amber-800 mt-1">
                        ⚠ {[...p.warnings, ...p.audit_issues].join(" · ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
              <div className="px-4 py-8 text-sm text-muted-foreground text-center">Nenhuma execução ainda.</div>
            )}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
