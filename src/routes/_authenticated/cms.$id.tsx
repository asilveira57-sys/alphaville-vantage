import { createFileRoute, Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { HtmlEditor } from "@/components/html-editor";
import { EditorialContent } from "@/components/editorial-content";
import { ImageUpload, ImageGalleryUpload } from "@/components/image-upload";
import { RelatedSelect } from "@/components/related-select";
import { useAutosave } from "@/components/editor/use-autosave";
import { PostHelpBlock } from "@/components/post-help-block";
import { PostCtaBlock } from "@/components/post-cta-block";
import { resolveImage } from "@/lib/image-fallbacks";
import { checkIsAdmin } from "@/lib/admin.functions";
import {
  getEditorialByIdAdmin,
  upsertEditorialPage,
  listBairroOptions,
  listCondominioOptions,
  generateSeoMetadata,
} from "@/lib/editorial.functions";
import { hasH1, hasInternalLink, wordCount } from "@/lib/sanitize-html";


export const Route = createFileRoute("/_authenticated/cms/$id")({
  head: () => ({ meta: [{ title: "Editar página — CMS" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: CmsEditorPage,
});

type HubCard = { eyebrow: string; title: string; lead: string; to: string; image: string };
type FaqItem = { question: string; answer: string };

type FormState = {
  id?: string;
  title: string;
  slug: string;
  content_type: "condominio" | "bairro" | "cidade" | "guia" | "blog" | "institucional" | "hub";
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
  hero_eyebrow: string;
  cards: HubCard[];
  // Bloco de ajuda
  help_title: string;
  help_text: string;
  help_button_label: string;
  help_button_url: string;
  // CTA
  cta_title: string;
  cta_text: string;
  cta_button_label: string;
  cta_button_url: string;
  // Classificações
  cidade: string;
  regiao: string;
  bairro: string;
  condominio: string;
  categoria_editorial: string;
  perfil_publico: string;
  intencao_imobiliaria: string;
  tipos_imovel_relacionados: string[];
  tags_contextuais: string[];
  // Radar
  conversion_context: string;
  personalization_enabled: boolean;
  // Metadados
  reading_minutes: number | null;
  faq: FaqItem[];
};

const EMPTY: FormState = {
  title: "", slug: "", content_type: "blog", excerpt: "", html_content: "",
  featured_image: "", gallery_images: [], status: "draft", is_featured: false,
  display_order: 0, tags: [], related_neighborhood: "", related_condominium: "",
  meta_title: "", meta_description: "", focus_keyword: "", secondary_keywords: [],
  canonical_url: "", og_title: "", og_description: "", og_image: "", schema_type: "Article",
  hero_eyebrow: "", cards: [],
  help_title: "", help_text: "", help_button_label: "", help_button_url: "",
  cta_title: "", cta_text: "", cta_button_label: "", cta_button_url: "",
  cidade: "", regiao: "", bairro: "", condominio: "",
  categoria_editorial: "", perfil_publico: "", intencao_imobiliaria: "",
  tipos_imovel_relacionados: [], tags_contextuais: [],
  conversion_context: "", personalization_enabled: false,
  reading_minutes: null, faq: [],
};

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

function isMeaningfullyEmptyHtml(html: string | null | undefined) {
  const raw = html ?? "";
  if (/<(img|iframe|video|audio|table)\b/i.test(raw)) return false;
  const text = raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0;
}

function toFormState(p: any): FormState {
  return {
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
    hero_eyebrow: p.hero_eyebrow ?? "",
    cards: Array.isArray(p.cards)
      ? p.cards.map((c: any) => ({
          eyebrow: c?.eyebrow ?? "",
          title: c?.title ?? "",
          lead: c?.lead ?? "",
          to: c?.to ?? "",
          image: c?.image ?? "",
        }))
      : [],
    help_title: p.help_title ?? "",
    help_text: p.help_text ?? "",
    help_button_label: p.help_button_label ?? "",
    help_button_url: p.help_button_url ?? "",
    cta_title: p.cta_title ?? "",
    cta_text: p.cta_text ?? "",
    cta_button_label: p.cta_button_label ?? "",
    cta_button_url: p.cta_button_url ?? "",
    cidade: p.cidade ?? "",
    regiao: p.regiao ?? "",
    bairro: p.bairro ?? "",
    condominio: p.condominio ?? "",
    categoria_editorial: p.categoria_editorial ?? "",
    perfil_publico: p.perfil_publico ?? "",
    intencao_imobiliaria: p.intencao_imobiliaria ?? "",
    tipos_imovel_relacionados: p.tipos_imovel_relacionados ?? [],
    tags_contextuais: p.tags_contextuais ?? [],
    conversion_context: p.conversion_context ?? "",
    personalization_enabled: !!p.personalization_enabled,
    reading_minutes: typeof p.reading_minutes === "number" ? p.reading_minutes : null,
    faq: Array.isArray(p.faq)
      ? p.faq.map((f: any) => ({ question: f?.question ?? "", answer: f?.answer ?? "" }))
      : [],
  };
}

function CmsEditorPage() {
  const { id } = Route.useParams();
  const isNew = id === "novo";
  const router = useRouter();
  const navigate = useNavigate();
  const checkFn = useServerFn(checkIsAdmin);
  const getFn = useServerFn(getEditorialByIdAdmin);
  const upsertFn = useServerFn(upsertEditorialPage);
  const bairrosFn = useServerFn(listBairroOptions);
  const condosFn = useServerFn(listCondominioOptions);
  const seoFn = useServerFn(generateSeoMetadata);

  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkFn() });
  const pageQ = useQuery({
    queryKey: ["cms", id],
    queryFn: () => getFn({ data: { id } }),
    enabled: !isNew && !!adminQ.data?.isAdmin,
  });
  const bairrosQ = useQuery({
    queryKey: ["cms-bairros"],
    queryFn: () => bairrosFn(),
    enabled: !!adminQ.data?.isAdmin,
  });
  const condosQ = useQuery({
    queryKey: ["cms-condos"],
    queryFn: () => condosFn(),
    enabled: !!adminQ.data?.isAdmin,
  });

  const [form, setForm] = useState<FormState>(EMPTY);
  const [tab, setTab] = useState<"conteudo" | "post" | "seo">("conteudo");
  const [preview, setPreview] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [loadedKey, setLoadedKey] = useState(isNew ? "novo" : "");
  const dbContentRef = useRef("");
  const snapKey = `cms:snapshot:${id}`;

  useEffect(() => {
    if (isNew) {
      if (loadedKey !== "novo") {
        setForm(EMPTY);
        dbContentRef.current = "";
        setSlugTouched(false);
        setLoadedKey("novo");
      }
      return;
    }
    if (!pageQ.data || loadedKey === id || (pageQ.data as any).id !== id) return;

    const dbForm = toFormState(pageQ.data);
    let nextForm = dbForm;

    try {
      const raw = sessionStorage.getItem(snapKey);
      if (raw) {
        const snap = JSON.parse(raw) as FormState;
        const safeSnapshot =
          snap.id === dbForm.id &&
          (!isMeaningfullyEmptyHtml(snap.html_content) || isMeaningfullyEmptyHtml(dbForm.html_content));

        if (safeSnapshot && snap.html_content !== dbForm.html_content) {
          if (window.confirm("Encontramos alterações não salvas desta página. Deseja restaurá-las?")) {
            nextForm = snap;
          } else {
            sessionStorage.removeItem(snapKey);
          }
        } else if (!safeSnapshot) {
          sessionStorage.removeItem(snapKey);
        }
      }
    } catch { /* ignore */ }

    setForm(nextForm);
    dbContentRef.current = dbForm.html_content;
    setSlugTouched(true);
    setLoadedKey(id);
  }, [pageQ.data, isNew, id, snapKey, loadedKey]);

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
      const htmlContent = isMeaningfullyEmptyHtml(form.html_content) && !isMeaningfullyEmptyHtml(dbContentRef.current)
        ? dbContentRef.current
        : form.html_content;
      return upsertFn({
        data: {
          id: form.id,
          title: form.title,
          slug: form.slug || slugify(form.title),
          content_type: form.content_type,
          excerpt: form.excerpt || null,
          html_content: htmlContent,
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
          hero_eyebrow: form.hero_eyebrow || null,
          cards: form.cards,
          help_title: form.help_title || null,
          help_text: form.help_text || null,
          help_button_label: form.help_button_label || null,
          help_button_url: form.help_button_url || null,
          cta_title: form.cta_title || null,
          cta_text: form.cta_text || null,
          cta_button_label: form.cta_button_label || null,
          cta_button_url: form.cta_button_url || null,
          cidade: form.cidade || null,
          regiao: form.regiao || null,
          bairro: form.bairro || null,
          condominio: form.condominio || null,
          categoria_editorial: form.categoria_editorial || null,
          perfil_publico: form.perfil_publico || null,
          intencao_imobiliaria: form.intencao_imobiliaria || null,
          tipos_imovel_relacionados: form.tipos_imovel_relacionados,
          tags_contextuais: form.tags_contextuais,
          conversion_context: form.conversion_context || null,
          personalization_enabled: form.personalization_enabled,
          reading_minutes: form.reading_minutes,
          faq: form.faq,
        } as any,
      });
    },
    onSuccess: (row: any) => {
      dbContentRef.current = row?.html_content ?? form.html_content;
      if (isNew && row?.id) {
        navigate({ to: "/cms/$id", params: { id: row.id } });
      } else {
        router.invalidate();
      }
    },
  });

  // -------- Session storage snapshot (recovery from accidental reload) --------
  useEffect(() => {
    if (isNew || !form.id || loadedKey !== id) return;
    if (isMeaningfullyEmptyHtml(form.html_content) && !isMeaningfullyEmptyHtml(dbContentRef.current)) return;
    try { sessionStorage.setItem(snapKey, JSON.stringify(form)); } catch { /* quota */ }
  }, [form, isNew, snapKey, loadedKey, id]);

  // -------- Auto-save (debounced) --------
  const autoSave = useCallback(async (f: FormState) => {
    if (!f.id || !f.title) return;
    if (isMeaningfullyEmptyHtml(f.html_content) && !isMeaningfullyEmptyHtml(dbContentRef.current)) return;
    await upsertFn({
      data: {
        id: f.id,
        title: f.title,
        slug: f.slug || slugify(f.title),
        content_type: f.content_type,
        excerpt: f.excerpt || null,
        html_content: f.html_content,
        featured_image: f.featured_image || null,
        gallery_images: f.gallery_images,
        status: f.status,
        is_featured: f.is_featured,
        display_order: f.display_order,
        tags: f.tags,
        related_neighborhood: f.related_neighborhood || null,
        related_condominium: f.related_condominium || null,
        meta_title: f.meta_title || null,
        meta_description: f.meta_description || null,
        focus_keyword: f.focus_keyword || null,
        secondary_keywords: f.secondary_keywords,
        canonical_url: f.canonical_url || null,
        og_title: f.og_title || null,
        og_description: f.og_description || null,
        og_image: f.og_image || null,
        schema_type: f.schema_type,
        hero_eyebrow: f.hero_eyebrow || null,
        cards: f.cards,
        help_title: f.help_title || null,
        help_text: f.help_text || null,
        help_button_label: f.help_button_label || null,
        help_button_url: f.help_button_url || null,
        cta_title: f.cta_title || null,
        cta_text: f.cta_text || null,
        cta_button_label: f.cta_button_label || null,
        cta_button_url: f.cta_button_url || null,
        cidade: f.cidade || null,
        regiao: f.regiao || null,
        bairro: f.bairro || null,
        condominio: f.condominio || null,
        categoria_editorial: f.categoria_editorial || null,
        perfil_publico: f.perfil_publico || null,
        intencao_imobiliaria: f.intencao_imobiliaria || null,
        tipos_imovel_relacionados: f.tipos_imovel_relacionados,
        tags_contextuais: f.tags_contextuais,
        conversion_context: f.conversion_context || null,
        personalization_enabled: f.personalization_enabled,
        reading_minutes: f.reading_minutes,
        faq: f.faq,
      } as any,
    });
    dbContentRef.current = f.html_content;
    try { sessionStorage.removeItem(snapKey); } catch { /* ignore */ }
  }, [upsertFn, snapKey]);

  const autosaveEnabled = !isNew && loadedKey === id && !!form.id && form.status !== "published";
  const { state: saveState } = useAutosave({
    data: form,
    save: autoSave,
    enabled: autosaveEnabled,
    debounceMs: 2000,
    resetKey: loadedKey,
  });


  const seoMut = useMutation({
    mutationFn: async () => {
      return seoFn({
        data: {
          title: form.title,
          excerpt: form.excerpt || null,
          html_content: form.html_content || null,
          content_type: form.content_type,
          related_neighborhood: form.related_neighborhood || null,
        },
      });
    },
    onSuccess: (res: any) => {
      setForm((f) => ({
        ...f,
        meta_title: res.meta_title || f.meta_title,
        meta_description: res.meta_description || f.meta_description,
        focus_keyword: res.focus_keyword || f.focus_keyword,
        secondary_keywords: res.secondary_keywords?.length ? res.secondary_keywords : f.secondary_keywords,
      }));
    },
  });

  const bairroOpts = (bairrosQ.data ?? []).map((b) => ({ value: b.slug, label: b.title, hint: b.slug }));
  const condoOpts = (condosQ.data ?? []).map((c) => ({ value: c.id, label: c.name, hint: c.region ?? undefined }));

  if (adminQ.isLoading) return <SiteLayout><div className="px-6 py-24 text-sm">Carregando…</div></SiteLayout>;
  if (!adminQ.data?.isAdmin) return <SiteLayout><div className="px-6 py-24 text-sm">Acesso restrito.</div></SiteLayout>;
  if (!isNew && (pageQ.isLoading || loadedKey !== id)) return <SiteLayout><div className="px-6 py-24 text-sm">Carregando página…</div></SiteLayout>;

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link to="/cms" className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-ink">← CMS</Link>
            <h1 className="font-serif text-3xl text-ink mt-2">{isNew ? "Nova página" : "Editar página"}</h1>
          </div>
          <div className="flex gap-3 items-center">
            <AutoSaveIndicator state={saveState} enabled={autosaveEnabled} status={form.status} />
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
          {(["conteudo", "post", "seo"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 -mb-px border-b-2 ${tab === t ? "border-ink text-ink" : "border-transparent text-muted-foreground"}`}>
              {t === "conteudo" ? "Conteúdo" : t === "post" ? "Post & CTA" : "SEO & Open Graph"}
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
                  <FullPostPreview form={form} />
                ) : (
                  <HtmlEditor value={form.html_content} onChange={(v) => set("html_content", v)} documentKey={id} />
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
                  <option value="hub">Hub / Guia regional</option>
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
              {form.content_type === "hub" && (
                <>
                  <Field label="Eyebrow do hero (ex.: Guia Regional)">
                    <input value={form.hero_eyebrow} onChange={(e) => set("hero_eyebrow", e.target.value)} className={inputCls} />
                  </Field>
                  <div className="border border-ink/15 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Cards do hub ({form.cards.length})</span>
                      <button
                        type="button"
                        onClick={() => set("cards", [...form.cards, { eyebrow: "", title: "", lead: "", to: "", image: "" }])}
                        className="text-[10px] uppercase tracking-widest border border-ink/20 px-3 py-1 hover:bg-ink/5"
                      >+ Card</button>
                    </div>
                    {form.cards.map((c, i) => (
                      <div key={i} className="border border-ink/10 p-3 space-y-2 bg-ink/[0.02]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">#{i + 1}</span>
                          <div className="flex gap-2 text-[10px] uppercase tracking-widest">
                            {i > 0 && (
                              <button type="button" onClick={() => {
                                const next = [...form.cards];
                                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                                set("cards", next);
                              }} className="hover:underline">↑</button>
                            )}
                            {i < form.cards.length - 1 && (
                              <button type="button" onClick={() => {
                                const next = [...form.cards];
                                [next[i + 1], next[i]] = [next[i], next[i + 1]];
                                set("cards", next);
                              }} className="hover:underline">↓</button>
                            )}
                            <button type="button" onClick={() => set("cards", form.cards.filter((_, j) => j !== i))} className="text-red-600 hover:underline">excluir</button>
                          </div>
                        </div>
                        <input placeholder="Eyebrow" value={c.eyebrow} onChange={(e) => { const n = [...form.cards]; n[i] = { ...c, eyebrow: e.target.value }; set("cards", n); }} className={inputCls} />
                        <input placeholder="Título" value={c.title} onChange={(e) => { const n = [...form.cards]; n[i] = { ...c, title: e.target.value }; set("cards", n); }} className={inputCls} />
                        <textarea placeholder="Descrição curta" rows={2} value={c.lead} onChange={(e) => { const n = [...form.cards]; n[i] = { ...c, lead: e.target.value }; set("cards", n); }} className={inputCls} />
                        <input placeholder="Link (ex.: /artigos/slug)" value={c.to} onChange={(e) => { const n = [...form.cards]; n[i] = { ...c, to: e.target.value }; set("cards", n); }} className={`${inputCls} font-mono`} />
                      </div>
                    ))}
                    {form.cards.length === 0 && <p className="text-xs text-muted-foreground">Nenhum card. Clique em “+ Card”.</p>}
                  </div>
                </>
              )}
              <Field label="Imagem principal">
                <ImageUpload
                  value={form.featured_image}
                  onUploaded={(url) => set("featured_image", url)}
                  folder="featured"
                />
              </Field>
              <Field label="Galeria de imagens">
                <ImageGalleryUpload
                  value={form.gallery_images}
                  onChange={(urls) => set("gallery_images", urls)}
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
                <RelatedSelect
                  value={form.related_neighborhood}
                  onChange={(v) => set("related_neighborhood", v)}
                  options={bairroOpts}
                  loading={bairrosQ.isLoading}
                  placeholder={bairroOpts.length ? "Selecionar bairro…" : "Nenhuma página de bairro cadastrada"}
                />
              </Field>
              <Field label="Condomínio relacionado">
                <RelatedSelect
                  value={form.related_condominium}
                  onChange={(v) => set("related_condominium", v)}
                  options={condoOpts}
                  loading={condosQ.isLoading}
                  placeholder={condoOpts.length ? "Selecionar condomínio…" : "Nenhum condomínio cadastrado"}
                />
              </Field>
            </div>
          </div>
        )}

        {tab === "post" && (
          <div className="space-y-8 max-w-4xl">
            <section className="space-y-4">
              <h3 className="text-sm font-medium text-ink">Bloco "Como a S.A. Imóveis pode ajudar"</h3>
              <p className="text-xs text-muted-foreground">Aparece próximo ao final do post. Se ficar em branco, usa a versão padrão.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Título">
                  <input value={form.help_title} onChange={(e) => set("help_title", e.target.value)} className={inputCls} placeholder="Como a S.A. Imóveis pode ajudar" />
                </Field>
                <Field label="Texto do botão">
                  <input value={form.help_button_label} onChange={(e) => set("help_button_label", e.target.value)} className={inputCls} placeholder="Ver imóveis disponíveis" />
                </Field>
                <Field label="Texto">
                  <textarea value={form.help_text} onChange={(e) => set("help_text", e.target.value)} rows={3} className={inputCls} />
                </Field>
                <Field label="Link do botão">
                  <input value={form.help_button_url} onChange={(e) => set("help_button_url", e.target.value)} className={`${inputCls} font-mono`} placeholder="/imoveis" />
                </Field>
              </div>
            </section>

            <section className="space-y-4 border-t border-ink/10 pt-6">
              <h3 className="text-sm font-medium text-ink">CTA contextual (final do post)</h3>
              <p className="text-xs text-muted-foreground">Ex.: "Ver imóveis próximos às escolas", "Ver oportunidades de investimento". Vazio = CTA padrão.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="cta_title"><input value={form.cta_title} onChange={(e) => set("cta_title", e.target.value)} className={inputCls} /></Field>
                <Field label="cta_button_label"><input value={form.cta_button_label} onChange={(e) => set("cta_button_label", e.target.value)} className={inputCls} /></Field>
                <Field label="cta_text"><textarea value={form.cta_text} onChange={(e) => set("cta_text", e.target.value)} rows={3} className={inputCls} /></Field>
                <Field label="cta_button_url"><input value={form.cta_button_url} onChange={(e) => set("cta_button_url", e.target.value)} className={`${inputCls} font-mono`} placeholder="/imoveis?..." /></Field>
              </div>
            </section>

            <section className="space-y-4 border-t border-ink/10 pt-6">
              <h3 className="text-sm font-medium text-ink">Perguntas frequentes</h3>
              <div className="space-y-3">
                {form.faq.map((item, i) => (
                  <div key={i} className="border border-ink/10 p-3 space-y-2 bg-ink/[0.02]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">#{i + 1}</span>
                      <button type="button" onClick={() => set("faq", form.faq.filter((_, j) => j !== i))} className="text-[10px] uppercase tracking-widest text-red-600 hover:underline">excluir</button>
                    </div>
                    <input placeholder="Pergunta" value={item.question} onChange={(e) => { const n = [...form.faq]; n[i] = { ...item, question: e.target.value }; set("faq", n); }} className={inputCls} />
                    <textarea placeholder="Resposta" rows={2} value={item.answer} onChange={(e) => { const n = [...form.faq]; n[i] = { ...item, answer: e.target.value }; set("faq", n); }} className={inputCls} />
                  </div>
                ))}
                <button type="button" onClick={() => set("faq", [...form.faq, { question: "", answer: "" }])} className="text-[10px] uppercase tracking-widest border border-ink/20 px-3 py-1 hover:bg-ink/5">+ Pergunta</button>
              </div>
            </section>

            <section className="space-y-4 border-t border-ink/10 pt-6">
              <h3 className="text-sm font-medium text-ink">Classificações internas</h3>
              <p className="text-xs text-muted-foreground">Não aparecem no post. Usadas para organização e futura personalização.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Cidade"><input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} className={inputCls} /></Field>
                <Field label="Região"><input value={form.regiao} onChange={(e) => set("regiao", e.target.value)} className={inputCls} /></Field>
                <Field label="Bairro"><input value={form.bairro} onChange={(e) => set("bairro", e.target.value)} className={inputCls} /></Field>
                <Field label="Condomínio"><input value={form.condominio} onChange={(e) => set("condominio", e.target.value)} className={inputCls} /></Field>
                <Field label="Categoria editorial"><input value={form.categoria_editorial} onChange={(e) => set("categoria_editorial", e.target.value)} className={inputCls} placeholder="coworking, escolas, condomínios…" /></Field>
                <Field label="Perfil do público"><input value={form.perfil_publico} onChange={(e) => set("perfil_publico", e.target.value)} className={inputCls} placeholder="família, executivo, investidor…" /></Field>
                <Field label="Intenção imobiliária"><input value={form.intencao_imobiliaria} onChange={(e) => set("intencao_imobiliaria", e.target.value)} className={inputCls} placeholder="morar, investir, comercial…" /></Field>
                <Field label="Tempo de leitura (min)"><input type="number" min={0} value={form.reading_minutes ?? ""} onChange={(e) => set("reading_minutes", e.target.value ? Number(e.target.value) : null)} className={inputCls} /></Field>
                <Field label="Tipos de imóvel relacionados (vírgula)">
                  <input value={form.tipos_imovel_relacionados.join(", ")} onChange={(e) => set("tipos_imovel_relacionados", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className={inputCls} placeholder="casa, apartamento, terreno" />
                </Field>
                <Field label="Tags contextuais (vírgula)">
                  <input value={form.tags_contextuais.join(", ")} onChange={(e) => set("tags_contextuais", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className={inputCls} />
                </Field>
              </div>
            </section>

            <section className="space-y-4 border-t border-ink/10 pt-6">
              <h3 className="text-sm font-medium text-ink">Radar (armazenado, sem ação automática)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="conversion_context">
                  <select value={form.conversion_context} onChange={(e) => set("conversion_context", e.target.value)} className={inputCls}>
                    <option value="">—</option>
                    <option value="morar_perto_trabalho">morar_perto_trabalho</option>
                    <option value="morar_perto_escola">morar_perto_escola</option>
                    <option value="buscar_condominio">buscar_condominio</option>
                    <option value="buscar_bairro">buscar_bairro</option>
                    <option value="mudar_para_alphaville">mudar_para_alphaville</option>
                    <option value="buscar_imovel_comercial">buscar_imovel_comercial</option>
                    <option value="investir_em_imovel">investir_em_imovel</option>
                    <option value="investir_em_terreno">investir_em_terreno</option>
                    <option value="comparar_regioes">comparar_regioes</option>
                  </select>
                </Field>
                <Field label="Personalização futura">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.personalization_enabled} onChange={(e) => set("personalization_enabled", e.target.checked)} />
                    Ativar espaço personalizado (desligado por padrão)
                  </label>
                </Field>
              </div>
            </section>
          </div>
        )}


        {tab === "seo" && (
          <div className="space-y-4 max-w-4xl">
            <div className="border border-ink/15 p-4 bg-ink/[0.02] flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-medium text-ink">Geração automática de SEO</h3>
                <p className="text-xs text-muted-foreground mt-0.5">A IA usa o título, resumo e conteúdo para sugerir meta title, description e palavras-chave.</p>
                {seoMut.error && <p className="text-xs text-red-600 mt-1">{(seoMut.error as Error).message}</p>}
              </div>
              <button
                type="button"
                onClick={() => seoMut.mutate()}
                disabled={seoMut.isPending || !form.title}
                className="bg-ink text-canvas px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink/85 disabled:opacity-50 whitespace-nowrap"
              >
                {seoMut.isPending ? "Gerando…" : "✨ Gerar SEO com IA"}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <Field label="OG image">
                <ImageUpload
                  value={form.og_image}
                  onUploaded={(url) => set("og_image", url)}
                  folder="og"
                />
              </Field>
            </div>
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

function AutoSaveIndicator({
  state,
  enabled,
  status,
}: {
  state: import("@/components/editor/use-autosave").SaveState;
  enabled: boolean;
  status: string;
}) {
  if (!enabled) {
    return (
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {status === "published" ? "Auto-save pausado (publicado)" : "Auto-save desativado"}
      </span>
    );
  }
  if (state.kind === "saving") return <span className="text-[11px] uppercase tracking-widest text-amber-700">Salvando…</span>;
  if (state.kind === "dirty") return <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Alterações pendentes…</span>;
  if (state.kind === "saved") {
    const t = new Date(state.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return <span className="text-[11px] uppercase tracking-widest text-emerald-700">✓ Salvo às {t}</span>;
  }
  if (state.kind === "error") return <span className="text-[11px] uppercase tracking-widest text-red-600" title={state.message}>Erro ao salvar</span>;
  return <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Pronto</span>;
}
