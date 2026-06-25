import { createFileRoute, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { HtmlEditor } from "@/components/html-editor";
import { EditorialContent } from "@/components/editorial-content";
import { checkIsAdmin } from "@/lib/admin.functions";
import { getEditorialByIdAdmin, upsertEditorialPage } from "@/lib/editorial.functions";
import { hasH1, hasInternalLink, wordCount } from "@/lib/sanitize-html";

export const Route = createFileRoute("/_authenticated/cms/$id")({
  head: () => ({ meta: [{ title: "Editar página — CMS" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: CmsEditorPage,
});

type FormState = {
  id?: string;
  title: string;
  slug: string;
  content_type: "condominio" | "bairro" | "cidade" | "guia" | "blog" | "institucional";
  excerpt: string;
  html_content: string;
  featured_image: string;
  gallery_images: string[];
  status: "draft" | "published" | "archived";
  is_featured: boolean;
  display_order: number;
  tags: string[];
  related_neighborhood: string;
  related_condominium: string;
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  secondary_keywords: string[];
  canonical_url: string;
  og_title: string;
  og_description: string;
  og_image: string;
  schema_type: "Article" | "BlogPosting" | "Place" | "Residence" | "LocalBusiness";
};

const EMPTY: FormState = {
  title: "", slug: "", content_type: "blog", excerpt: "", html_content: "",
  featured_image: "", gallery_images: [], status: "draft", is_featured: false,
  display_order: 0, tags: [], related_neighborhood: "", related_condominium: "",
  meta_title: "", meta_description: "", focus_keyword: "", secondary_keywords: [],
  canonical_url: "", og_title: "", og_description: "", og_image: "", schema_type: "Article",
};

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

function CmsEditorPage() {
  const { id } = Route.useParams();
  const isNew = id === "novo";
  const router = useRouter();
  const navigate = useNavigate();
  const checkFn = useServerFn(checkIsAdmin);
  const getFn = useServerFn(getEditorialByIdAdmin);
  const upsertFn = useServerFn(upsertEditorialPage);

  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkFn() });
  const pageQ = useQuery({
    queryKey: ["cms", id],
    queryFn: () => getFn({ data: { id } }),
    enabled: !isNew && !!adminQ.data?.isAdmin,
  });

  const [form, setForm] = useState<FormState>(EMPTY);
  const [tab, setTab] = useState<"conteudo" | "seo">("conteudo");
  const [preview, setPreview] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);

  useEffect(() => {
    if (pageQ.data) {
      const p: any = pageQ.data;
      setForm({
        id: p.id,
        title: p.title ?? "",
        slug: p.slug ?? "",
        content_type: p.content_type,
        excerpt: p.excerpt ?? "",
        html_content: p.html_content ?? "",
        featured_image: p.featured_image ?? "",
        gallery_images: p.gallery_images ?? [],
        status: p.status,
        is_featured: !!p.is_featured,
        display_order: p.display_order ?? 0,
        tags: p.tags ?? [],
        related_neighborhood: p.related_neighborhood ?? "",
        related_condominium: p.related_condominium ?? "",
        meta_title: p.meta_title ?? "",
        meta_description: p.meta_description ?? "",
        focus_keyword: p.focus_keyword ?? "",
        secondary_keywords: p.secondary_keywords ?? [],
        canonical_url: p.canonical_url ?? "",
        og_title: p.og_title ?? "",
        og_description: p.og_description ?? "",
        og_image: p.og_image ?? "",
        schema_type: p.schema_type ?? "Article",
      });
      setSlugTouched(true);
    }
  }, [pageQ.data]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onTitleChange(v: string) {
    set("title", v);
    if (!slugTouched) setForm((f) => ({ ...f, title: v, slug: slugify(v) }));
  }

  const score = useMemo(() => {
    const checks = [
      { id: "Meta title", ok: !!form.meta_title },
      { id: "Meta description", ok: !!form.meta_description },
      { id: "Slug", ok: !!form.slug },
      { id: "H1 no conteúdo", ok: hasH1(form.html_content) },
      { id: "600+ palavras", ok: wordCount(form.html_content) >= 600 },
      { id: "Link interno", ok: hasInternalLink(form.html_content) },
    ];
    return { checks, passed: checks.filter((c) => c.ok).length };
  }, [form]);

  const saveMut = useMutation({
    mutationFn: async () => {
      return upsertFn({
        data: {
          id: form.id,
          title: form.title,
          slug: form.slug || slugify(form.title),
          content_type: form.content_type,
          excerpt: form.excerpt || null,
          html_content: form.html_content,
          featured_image: form.featured_image || null,
          gallery_images: form.gallery_images,
          status: form.status,
          is_featured: form.is_featured,
          display_order: form.display_order,
          tags: form.tags,
          related_neighborhood: form.related_neighborhood || null,
          related_condominium: form.related_condominium || null,
          meta_title: form.meta_title || null,
          meta_description: form.meta_description || null,
          focus_keyword: form.focus_keyword || null,
          secondary_keywords: form.secondary_keywords,
          canonical_url: form.canonical_url || null,
          og_title: form.og_title || null,
          og_description: form.og_description || null,
          og_image: form.og_image || null,
          schema_type: form.schema_type,
        } as any,
      });
    },
    onSuccess: (row: any) => {
      if (isNew && row?.id) {
        navigate({ to: "/_authenticated/cms/$id", params: { id: row.id } });
      } else {
        router.invalidate();
      }
    },
  });

  if (adminQ.isLoading) return <SiteLayout><div className="px-6 py-24 text-sm">Carregando…</div></SiteLayout>;
  if (!adminQ.data?.isAdmin) return <SiteLayout><div className="px-6 py-24 text-sm">Acesso restrito.</div></SiteLayout>;
  if (!isNew && pageQ.isLoading) return <SiteLayout><div className="px-6 py-24 text-sm">Carregando página…</div></SiteLayout>;

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link to="/cms" className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-ink">← CMS</Link>
            <h1 className="font-serif text-3xl text-ink mt-2">{isNew ? "Nova página" : "Editar página"}</h1>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => setPreview((p) => !p)} className="text-xs uppercase tracking-widest border border-ink/20 px-4 py-2 hover:bg-ink/5">
              {preview ? "Editor" : "Pré-visualizar"}
            </button>
            <button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || !form.title}
              className="bg-ink text-canvas px-5 py-2.5 text-xs uppercase tracking-widest font-medium hover:bg-ink/85 disabled:opacity-50"
            >
              {saveMut.isPending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>

        {saveMut.error && <p className="text-xs text-red-600">{(saveMut.error as Error).message}</p>}
        {saveMut.data && <p className="text-xs text-emerald-700">Salvo.</p>}

        {/* SEO score */}
        <div className="border border-ink/10 px-4 py-3 flex gap-4 flex-wrap items-center text-xs">
          <strong className="text-[10px] uppercase tracking-widest text-muted-foreground">SEO {score.passed}/{score.checks.length}</strong>
          {score.checks.map((c) => (
            <span key={c.id} className={c.ok ? "text-emerald-700" : "text-amber-700"}>{c.ok ? "✓" : "○"} {c.id}</span>
          ))}
        </div>

        <div className="flex gap-2 text-xs uppercase tracking-widest border-b border-ink/10">
          {(["conteudo", "seo"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 -mb-px border-b-2 ${tab === t ? "border-ink text-ink" : "border-transparent text-muted-foreground"}`}>
              {t === "conteudo" ? "Conteúdo" : "SEO & Open Graph"}
            </button>
          ))}
        </div>

        {tab === "conteudo" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Field label="Título">
                <input value={form.title} onChange={(e) => onTitleChange(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Slug">
                <input
                  value={form.slug}
                  onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }}
                  className={`${inputCls} font-mono`}
                  placeholder="ex: residencial-1"
                />
              </Field>
              <Field label="Resumo curto">
                <textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} className={inputCls} />
              </Field>
              <Field label="Conteúdo (HTML)">
                {preview ? (
                  <div className="border border-ink/15 p-6 min-h-[420px] bg-canvas">
                    <EditorialContent html={form.html_content} />
                  </div>
                ) : (
                  <HtmlEditor value={form.html_content} onChange={(v) => set("html_content", v)} />
                )}
              </Field>
            </div>

            <div className="space-y-4">
              <Field label="Tipo de conteúdo">
                <select value={form.content_type} onChange={(e) => set("content_type", e.target.value as any)} className={inputCls}>
                  <option value="condominio">Condomínio</option>
                  <option value="bairro">Bairro</option>
                  <option value="cidade">Cidade</option>
                  <option value="guia">Guia local</option>
                  <option value="blog">Blog</option>
                  <option value="institucional">Institucional</option>
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(e) => set("status", e.target.value as any)} className={inputCls}>
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </Field>
              <Field label="Destaque">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} />
                  Marcar como destaque
                </label>
              </Field>
              <Field label="Ordem de exibição">
                <input type="number" value={form.display_order} onChange={(e) => set("display_order", Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Imagem principal (URL)">
                <input value={form.featured_image} onChange={(e) => set("featured_image", e.target.value)} className={inputCls} placeholder="https://…" />
              </Field>
              <Field label="Galeria (URLs, uma por linha)">
                <textarea
                  value={form.gallery_images.join("\n")}
                  onChange={(e) => set("gallery_images", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
                  rows={3} className={`${inputCls} font-mono text-xs`}
                />
              </Field>
              <Field label="Tags (separadas por vírgula)">
                <input
                  value={form.tags.join(", ")}
                  onChange={(e) => set("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  className={inputCls}
                />
              </Field>
              <Field label="Bairro relacionado">
                <input value={form.related_neighborhood} onChange={(e) => set("related_neighborhood", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Condomínio relacionado (UUID)">
                <input value={form.related_condominium} onChange={(e) => set("related_condominium", e.target.value)} className={`${inputCls} font-mono text-xs`} />
              </Field>
            </div>
          </div>
        )}

        {tab === "seo" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
            <Field label="Meta title">
              <input value={form.meta_title} onChange={(e) => set("meta_title", e.target.value)} className={inputCls} maxLength={70} />
              <small className="text-[11px] text-muted-foreground">{form.meta_title.length}/60 ideal</small>
            </Field>
            <Field label="Meta description">
              <textarea value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)} rows={3} className={inputCls} maxLength={180} />
              <small className="text-[11px] text-muted-foreground">{form.meta_description.length}/155 ideal</small>
            </Field>
            <Field label="Focus keyword">
              <input value={form.focus_keyword} onChange={(e) => set("focus_keyword", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Palavras-chave secundárias (vírgula)">
              <input
                value={form.secondary_keywords.join(", ")}
                onChange={(e) => set("secondary_keywords", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                className={inputCls}
              />
            </Field>
            <Field label="Canonical URL">
              <input value={form.canonical_url} onChange={(e) => set("canonical_url", e.target.value)} className={inputCls} placeholder="https://…" />
            </Field>
            <Field label="Schema.org type">
              <select value={form.schema_type} onChange={(e) => set("schema_type", e.target.value as any)} className={inputCls}>
                <option>Article</option><option>BlogPosting</option><option>Place</option><option>Residence</option><option>LocalBusiness</option>
              </select>
            </Field>
            <Field label="OG title">
              <input value={form.og_title} onChange={(e) => set("og_title", e.target.value)} className={inputCls} />
            </Field>
            <Field label="OG description">
              <textarea value={form.og_description} onChange={(e) => set("og_description", e.target.value)} rows={3} className={inputCls} />
            </Field>
            <Field label="OG image (URL)">
              <input value={form.og_image} onChange={(e) => set("og_image", e.target.value)} className={inputCls} />
            </Field>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

const inputCls = "w-full border border-ink/15 px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-ink";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}
