import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { checkIsAdmin } from "@/lib/admin.functions";
import {
  listEditorialPages,
  deleteEditorialPage,
  duplicateEditorialPage,
  togglePublishEditorial,
} from "@/lib/editorial.functions";
import { hasH1, hasInternalLink, wordCount } from "@/lib/sanitize-html";

const TYPES = [
  { value: "", label: "Todos os tipos" },
  { value: "condominio", label: "Condomínio" },
  { value: "bairro", label: "Bairro" },
  { value: "cidade", label: "Cidade" },
  { value: "guia", label: "Guia local" },
  { value: "blog", label: "Blog" },
  { value: "institucional", label: "Institucional" },
];

const STATUSES = [
  { value: "", label: "Todos os status" },
  { value: "draft", label: "Rascunho" },
  { value: "published", label: "Publicado" },
  { value: "archived", label: "Arquivado" },
];

export const Route = createFileRoute("/_authenticated/cms")({
  head: () => ({ meta: [{ title: "CMS Editorial — Portal S.A" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: CmsListPage,
});

function CmsListPage() {
  const qc = useQueryClient();
  const checkFn = useServerFn(checkIsAdmin);
  const listFn = useServerFn(listEditorialPages);
  const delFn = useServerFn(deleteEditorialPage);
  const dupFn = useServerFn(duplicateEditorialPage);
  const togFn = useServerFn(togglePublishEditorial);

  const [search, setSearch] = useState("");
  const [contentType, setContentType] = useState("");
  const [status, setStatus] = useState("");

  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkFn() });
  const listQ = useQuery({
    queryKey: ["cms", { search, contentType, status }],
    queryFn: () => listFn({
      data: {
        search: search || undefined,
        contentType: (contentType || undefined) as any,
        status: (status || undefined) as any,
      },
    }),
    enabled: !!adminQ.data?.isAdmin,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["cms"] });
  const delMut = useMutation({ mutationFn: (id: string) => delFn({ data: { id } }), onSuccess: refresh });
  const dupMut = useMutation({ mutationFn: (id: string) => dupFn({ data: { id } }), onSuccess: refresh });
  const togMut = useMutation({ mutationFn: (id: string) => togFn({ data: { id } }), onSuccess: refresh });

  if (adminQ.isLoading) return <SiteLayout><div className="px-6 py-24 text-sm">Carregando…</div></SiteLayout>;
  if (!adminQ.data?.isAdmin) {
    return <SiteLayout><div className="px-6 py-24 text-sm">Acesso restrito. <Link to="/_authenticated/admin" className="underline">Voltar ao admin</Link>.</div></SiteLayout>;
  }

  const rows = listQ.data ?? [];

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">CMS Editorial</p>
            <h1 className="font-serif text-4xl text-ink">Páginas editoriais</h1>
            <p className="text-sm text-muted-foreground mt-2">Condomínios, bairros, cidade, guias, blog e institucionais.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/_authenticated/admin" className="text-xs uppercase tracking-widest border border-ink/20 px-4 py-2 hover:bg-ink/5">← Admin</Link>
            <Link to="/_authenticated/cms/novo" className="bg-ink text-canvas px-5 py-2.5 text-xs uppercase tracking-widest font-medium hover:bg-ink/85">+ Nova página</Link>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap items-center border border-ink/10 p-3">
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título…"
            className="flex-1 min-w-[200px] border border-ink/15 px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-ink"
          />
          <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="border border-ink/15 px-3 py-2 text-sm bg-canvas">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-ink/15 px-3 py-2 text-sm bg-canvas">
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <span className="text-xs text-muted-foreground ml-auto">{rows.length} página(s)</span>
        </div>

        <div className="border border-ink/10">
          <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-ink/10 text-[10px] uppercase tracking-widest text-muted-foreground">
            <div className="col-span-4">Título</div>
            <div className="col-span-2">Tipo</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">SEO</div>
            <div className="col-span-3 text-right">Ações</div>
          </div>
          {rows.map((p: any) => {
            const score = seoScore(p);
            return (
              <div key={p.id} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-ink/8 text-sm items-center">
                <div className="col-span-4 min-w-0">
                  <div className="font-medium text-ink truncate">{p.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">/{p.slug}</div>
                </div>
                <div className="col-span-2 text-xs uppercase tracking-wider text-muted-foreground">{p.content_type}</div>
                <div className="col-span-1">
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-1 ${p.status === "published" ? "bg-emerald-100 text-emerald-800" : p.status === "archived" ? "bg-ink/10 text-muted-foreground" : "bg-amber-100 text-amber-800"}`}>
                    {p.status}
                  </span>
                </div>
                <div className="col-span-2">
                  <div className="text-xs font-mono">{score.passed}/{score.total}</div>
                  <div className="text-[10px] text-muted-foreground">{score.missing.length === 0 ? "ok" : score.missing.join(", ")}</div>
                </div>
                <div className="col-span-3 flex gap-2 justify-end text-xs uppercase tracking-widest">
                  {p.status === "published" && (
                    <a href={publicUrlFor(p)} target="_blank" rel="noreferrer" className="hover:underline">ver</a>
                  )}
                  <button onClick={() => togMut.mutate(p.id)} className="hover:underline">{p.status === "published" ? "despublicar" : "publicar"}</button>
                  <Link to="/_authenticated/cms/$id" params={{ id: p.id }} className="hover:underline">editar</Link>
                  <button onClick={() => dupMut.mutate(p.id)} className="hover:underline">duplicar</button>
                  <button onClick={() => { if (confirm("Excluir esta página?")) delMut.mutate(p.id); }} className="text-red-600 hover:underline">excluir</button>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Nenhuma página encontrada.</div>}
        </div>
      </div>
    </SiteLayout>
  );
}

function seoScore(p: any) {
  const html = p.html_content ?? "";
  const checks = [
    { id: "meta_title", ok: !!p.meta_title },
    { id: "meta_desc", ok: !!p.meta_description },
    { id: "slug", ok: !!p.slug },
    { id: "h1", ok: hasH1(html) },
    { id: "600+", ok: wordCount(html) >= 600 },
    { id: "link", ok: hasInternalLink(html) },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const missing = checks.filter((c) => !c.ok).map((c) => c.id);
  return { passed, total: checks.length, missing };
}

function publicUrlFor(p: any): string {
  switch (p.content_type) {
    case "condominio": return `/condominios/${p.slug}`;
    case "bairro": return `/bairros/${p.slug}`;
    case "blog": return `/blog/${p.slug}`;
    default: return `/`;
  }
}
