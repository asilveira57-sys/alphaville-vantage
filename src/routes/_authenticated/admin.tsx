import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site-layout";
import { checkIsAdmin, grantSelfAdminIfFirst } from "@/lib/admin.functions";
import { listAllPostsAdmin, generatePostWithAI, upsertPost } from "@/lib/blog.functions";
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
  const postsFn = useServerFn(listAllPostsAdmin);
  const runsFn = useServerFn(listScraperRuns);
  const genFn = useServerFn(generatePostWithAI);
  const scrapeFn = useServerFn(runScraper);
  const saveFn = useServerFn(upsertPost);
  const reprocessFn = useServerFn(reprocessProperties);
  const auditFn = useServerFn(getScrapAudit);
  const seoFn = useServerFn(regenerateSeo);
  const [seoUseAI, setSeoUseAI] = useState(false);

  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkFn() });
  const postsQ = useQuery({
    queryKey: ["adminPosts"], queryFn: () => postsFn(),
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
    onSuccess: () => { setTopic(""); qc.invalidateQueries({ queryKey: ["adminPosts"] }); },
  });
  const scrapeMut = useMutation({
    mutationFn: () => scrapeFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scraperRuns"] });
      qc.invalidateQueries({ queryKey: ["scrapAudit"] });
    },
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
          <button onClick={signOut} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-ink">Sair</button>
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
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-serif text-2xl text-ink">Posts</h2>
            <span className="text-xs text-muted-foreground">{postsQ.data?.length ?? 0} no total</span>
          </div>
          <div className="border border-ink/10">
            {(postsQ.data ?? []).map((p) => (
              <div key={p.id} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-ink/8 text-sm items-center">
                <div className="col-span-6 font-medium text-ink truncate">{p.title}</div>
                <div className="col-span-2 text-xs uppercase tracking-wider text-muted-foreground">{p.status}</div>
                <div className="col-span-2 text-xs text-muted-foreground">{p.source}</div>
                <div className="col-span-2 text-right">
                  {p.status !== "published" && (
                    <button
                      onClick={() => saveFn({ data: { id: p.id, title: p.title, status: "published", content_markdown: "" } as any })
                        .then(() => qc.invalidateQueries({ queryKey: ["adminPosts"] }))}
                      className="text-xs uppercase tracking-widest text-ink hover:underline"
                    >Publicar</button>
                  )}
                </div>
              </div>
            ))}
            {postsQ.data?.length === 0 && (
              <div className="px-4 py-8 text-sm text-muted-foreground text-center">Nenhum post ainda.</div>
            )}
          </div>
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
                onClick={() => scrapeMut.mutate()}
                disabled={scrapeMut.isPending}
                className="bg-ink text-canvas px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink/85 disabled:opacity-50"
              >
                {scrapeMut.isPending ? "Rodando…" : "Rodar agora"}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            O scraper já gera SEO + abertura com IA + auditoria de cada imóvel na primeira coleta. "Regerar SEO" e "Reprocessar" só são necessários se você alterar o template ou o parser.
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
              <Link to="/_authenticated/audit" className="border border-ink px-3 py-2 flex items-center justify-center text-xs uppercase tracking-widest hover:bg-ink hover:text-canvas">
                Abrir auditoria →
              </Link>
            </div>
          )}
          {scrapeMut.error && <p className="text-xs text-red-600 mb-3">{(scrapeMut.error as Error).message}</p>}
          {scrapeMut.data && (
            <p className="text-xs text-emerald-700 mb-3">
              Páginas: {scrapeMut.data.pages} · Imóveis upsertados: {scrapeMut.data.upserted} · Descobertos: {scrapeMut.data.discovered}
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
