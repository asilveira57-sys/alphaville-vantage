import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site-layout";
import { HtmlEditor } from "@/components/html-editor";
import { ImageUpload, uploadEditorialImageFile } from "@/components/image-upload";
import { useAutosave } from "@/components/editor/use-autosave";
import { STREET_TYPES, upsertStreet, deleteStreet } from "@/lib/streets.functions";

export const Route = createFileRoute("/_authenticated/admin-ruas/$id")({
  head: () => ({ meta: [{ title: "Editar rua — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: EditRua,
});

type GalleryItem = { url: string; alt: string; caption: string };
type FaqItem = { question: string; answer: string };

type Form = {
  name: string; official_name: string; street_type: string;
  neighborhood: string; city: string; state: string;
  postal_code_start: string; postal_code_end: string;
  short_description: string; description: string;
  history: string; real_estate_profile: string;
  access_information: string; traffic_information: string;
  public_transport_information: string; parking_information: string;
  hero_image: string; hero_image_alt: string;
  gallery_images: GalleryItem[];
  faq: FaqItem[];
  seo_title: string; seo_description: string; seo_keywords: string; canonical_url: string; h1: string;
  og_title: string; og_description: string; social_image: string;
  robots_index: boolean; robots_follow: boolean;
  featured: boolean; active: boolean; status: "draft" | "published" | "archived";
  slug: string;
};

const empty: Form = {
  name: "", official_name: "", street_type: "rua",
  neighborhood: "", city: "", state: "SP",
  postal_code_start: "", postal_code_end: "",
  short_description: "", description: "",
  history: "", real_estate_profile: "",
  access_information: "", traffic_information: "",
  public_transport_information: "", parking_information: "",
  hero_image: "", hero_image_alt: "",
  gallery_images: [], faq: [],
  seo_title: "", seo_description: "", seo_keywords: "", canonical_url: "", h1: "",
  og_title: "", og_description: "", social_image: "", robots_index: true, robots_follow: true,
  featured: false, active: true, status: "draft", slug: "",
};

function normalizeGallery(raw: unknown): GalleryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: any) => {
      if (typeof item === "string") return { url: item, alt: "", caption: "" };
      if (item && typeof item === "object" && typeof item.url === "string") {
        return { url: item.url, alt: item.alt ?? "", caption: item.caption ?? "" };
      }
      return null;
    })
    .filter(Boolean) as GalleryItem[];
}

function normalizeFaq(raw: unknown): FaqItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f: any) => f && typeof f === "object")
    .map((f: any) => ({ question: f.question ?? "", answer: f.answer ?? "" }));
}

const TABS = ["conteudo", "midia", "seo", "publicacao"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  conteudo: "Conteúdo",
  midia: "Mídia",
  seo: "SEO",
  publicacao: "Publicação",
};

function EditRua() {
  const { id } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertStreet);
  const deleteFn = useServerFn(deleteStreet);

  const [tab, setTab] = useState<Tab>("conteudo");
  const [form, setForm] = useState<Form>(empty);
  const [loaded, setLoaded] = useState(false);

  const streetQ = useQuery({
    queryKey: ["admin-street", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("streets").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  useEffect(() => {
    if (!streetQ.data) return;
    const d: any = streetQ.data;
    setForm({
      name: d.name ?? "", official_name: d.official_name ?? "", street_type: d.street_type ?? "rua",
      neighborhood: d.neighborhood ?? "", city: d.city ?? "", state: d.state ?? "SP",
      postal_code_start: d.postal_code_start ?? "", postal_code_end: d.postal_code_end ?? "",
      short_description: d.short_description ?? "", description: d.description ?? "",
      history: d.history ?? "", real_estate_profile: d.real_estate_profile ?? "",
      access_information: d.access_information ?? "", traffic_information: d.traffic_information ?? "",
      public_transport_information: d.public_transport_information ?? "",
      parking_information: d.parking_information ?? "",
      hero_image: d.hero_image ?? "", hero_image_alt: d.hero_image_alt ?? "",
      gallery_images: normalizeGallery(d.gallery_images), faq: normalizeFaq(d.faq),
      seo_title: d.seo_title ?? "", seo_description: d.seo_description ?? "",
      seo_keywords: d.seo_keywords ?? "", canonical_url: d.canonical_url ?? "",
      h1: d.h1 ?? "", featured: !!d.featured, active: d.active !== false,
      og_title: d.og_title ?? "", og_description: d.og_description ?? "",
      social_image: d.social_image ?? "",
      robots_index: d.robots_index !== false, robots_follow: d.robots_follow !== false,
      status: d.status ?? "draft", slug: d.slug ?? "",
    });
    setLoaded(true);
  }, [streetQ.data]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const persist = useCallback(async (data: Form) => {
    await upsertFn({ data: { id, ...data, street_type: data.street_type as any } });
    qc.invalidateQueries({ queryKey: ["admin-streets"] });
  }, [id, qc, upsertFn]);

  const { state: saveState, flush } = useAutosave({
    data: form,
    save: persist,
    enabled: loaded,
    resetKey: id,
  });

  const saveMut = useMutation({
    mutationFn: () => persist(form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-street", id] }),
  });

  const delMut = useMutation({
    mutationFn: () => deleteFn({ data: { id } }),
    onSuccess: () => router.navigate({ to: "/admin-ruas" }),
  });

  const saveLabel = useMemo(() => {
    switch (saveState.kind) {
      case "saving": return "Salvando…";
      case "dirty": return "Alterações não salvas";
      case "saved": return `Salvo automaticamente ${new Date(saveState.at).toLocaleTimeString("pt-BR")}`;
      case "error": return `Erro: ${saveState.message}`;
      default: return "Tudo salvo";
    }
  }, [saveState]);

  if (streetQ.isLoading) return <SiteLayout><div className="px-6 py-24 text-sm text-muted-foreground">Carregando…</div></SiteLayout>;
  if (!streetQ.data) return <SiteLayout><div className="px-6 py-24 text-sm text-muted-foreground text-center">Rua não encontrada. <Link to="/admin-ruas" className="underline">Voltar</Link></div></SiteLayout>;

  const input = "w-full border border-ink/15 px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-ink";
  const label = "block text-[10px] uppercase tracking-widest text-muted-foreground mb-1";
  const bind = <K extends keyof Form>(k: K) => ({
    value: form[k] as any,
    onChange: (e: any) => set(k, e.target.value as Form[K]),
  });

  async function addGalleryFiles(files: FileList | null) {
    if (!files?.length) return;
    const added: GalleryItem[] = [];
    for (const f of Array.from(files)) {
      const url = await uploadEditorialImageFile(f, "ruas");
      added.push({ url, alt: "", caption: "" });
    }
    setForm((f) => ({ ...f, gallery_images: [...f.gallery_images, ...added] }));
  }

  function updateGallery(i: number, patch: Partial<GalleryItem>) {
    setForm((f) => ({
      ...f,
      gallery_images: f.gallery_images.map((g, idx) => (idx === i ? { ...g, ...patch } : g)),
    }));
  }

  function moveGallery(i: number, dir: -1 | 1) {
    setForm((f) => {
      const next = [...f.gallery_images];
      const j = i + dir;
      if (j < 0 || j >= next.length) return f;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...f, gallery_images: next };
    });
  }

  return (
    <SiteLayout>
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-8">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <Link to="/admin-ruas" className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-ink">← Ruas</Link>
            <h1 className="font-serif text-3xl text-ink mt-2">{form.name || "Nova rua"}</h1>
            {form.slug && <p className="text-xs text-muted-foreground mt-1">/ruas/{form.slug}</p>}
            <p className={`text-[11px] mt-2 ${saveState.kind === "error" ? "text-red-600" : "text-muted-foreground"}`}>{saveLabel}</p>
          </div>
          <div className="flex gap-2">
            <a href={`/ruas/${form.slug}`} target="_blank" rel="noreferrer" className="border border-ink/20 px-4 py-2 text-xs uppercase tracking-widest hover:bg-ink/5">
              {form.status === "published" ? "Ver ao vivo →" : "Pré-visualizar →"}
            </a>
            <button onClick={() => { if (confirm("Excluir esta rua?")) delMut.mutate(); }} className="border border-red-600/40 text-red-600 px-4 py-2 text-xs uppercase tracking-widest hover:bg-red-50">Excluir</button>
            <button onClick={() => { void flush(); saveMut.mutate(); }} disabled={saveMut.isPending} className="bg-ink text-canvas px-5 py-2 text-xs uppercase tracking-widest hover:bg-ink/85 disabled:opacity-50">
              {saveMut.isPending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>

        {saveMut.error && <p className="text-xs text-red-600">{(saveMut.error as Error).message}</p>}

        <div className="flex gap-6 border-b border-ink/10">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-xs uppercase tracking-widest ${tab === t ? "text-ink border-b-2 border-ink" : "text-muted-foreground hover:text-ink"}`}
            >{TAB_LABEL[t]}</button>
          ))}
        </div>

        {tab === "conteudo" && (
          <div className="space-y-10">
            <section className="space-y-4">
              <h2 className="font-serif text-lg text-ink">Identificação</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={label}>Nome *</label><input className={input} {...bind("name")} /></div>
                <div><label className={label}>Nome oficial</label><input className={input} {...bind("official_name")} /></div>
                <div>
                  <label className={label}>Tipo</label>
                  <select className={input} {...bind("street_type")}>
                    {STREET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className={label}>Slug (auto se vazio)</label><input className={input} {...bind("slug")} /></div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="font-serif text-lg text-ink">Localização</h2>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={label}>Bairro</label><input className={input} {...bind("neighborhood")} /></div>
                <div><label className={label}>Cidade</label><input className={input} {...bind("city")} /></div>
                <div><label className={label}>Estado</label><input className={input} {...bind("state")} /></div>
                <div><label className={label}>CEP inicial</label><input className={input} {...bind("postal_code_start")} /></div>
                <div><label className={label}>CEP final</label><input className={input} {...bind("postal_code_end")} /></div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="font-serif text-lg text-ink">Resumo</h2>
              <div>
                <label className={label}>Descrição curta (aparece no topo e nas listagens)</label>
                <textarea rows={3} className={input} {...bind("short_description")} />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-lg text-ink">Conteúdo editorial</h2>
              <p className="text-[11px] text-muted-foreground">
                Editor completo: títulos H2/H3, listas, links, tabelas e imagens com texto alternativo (alt) e legenda.
              </p>
              <div className="border border-ink/15">
                <HtmlEditor
                  value={form.description}
                  onChange={(v) => set("description", v)}
                  documentKey={id}
                  placeholder="Escreva sobre a via, o entorno, o perfil imobiliário…"
                />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="font-serif text-lg text-ink">Blocos complementares</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={label}>História</label><textarea rows={4} className={input} {...bind("history")} /></div>
                <div><label className={label}>Perfil imobiliário</label><textarea rows={4} className={input} {...bind("real_estate_profile")} /></div>
                <div><label className={label}>Acesso</label><textarea rows={3} className={input} {...bind("access_information")} /></div>
                <div><label className={label}>Trânsito</label><textarea rows={3} className={input} {...bind("traffic_information")} /></div>
                <div><label className={label}>Transporte público</label><textarea rows={3} className={input} {...bind("public_transport_information")} /></div>
                <div><label className={label}>Estacionamento</label><textarea rows={3} className={input} {...bind("parking_information")} /></div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg text-ink">Perguntas frequentes</h2>
                <button
                  onClick={() => set("faq", [...form.faq, { question: "", answer: "" }])}
                  className="text-xs uppercase tracking-widest border border-ink/20 px-3 py-1.5 hover:bg-ink/5"
                >Adicionar pergunta</button>
              </div>
              {form.faq.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma pergunta cadastrada.</p>}
              <div className="space-y-4">
                {form.faq.map((f, i) => (
                  <div key={i} className="border border-ink/10 p-4 space-y-2">
                    <div className="flex gap-2">
                      <input
                        className={input} placeholder="Pergunta" value={f.question}
                        onChange={(e) => set("faq", form.faq.map((x, idx) => idx === i ? { ...x, question: e.target.value } : x))}
                      />
                      <button
                        onClick={() => set("faq", form.faq.filter((_, idx) => idx !== i))}
                        className="text-[11px] uppercase tracking-widest text-red-600 px-2"
                      >Remover</button>
                    </div>
                    <textarea
                      rows={3} className={input} placeholder="Resposta" value={f.answer}
                      onChange={(e) => set("faq", form.faq.map((x, idx) => idx === i ? { ...x, answer: e.target.value } : x))}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "midia" && (
          <div className="space-y-10">
            <section className="space-y-4">
              <h2 className="font-serif text-lg text-ink">Imagem principal</h2>
              <ImageUpload
                value={form.hero_image}
                onUploaded={(url) => set("hero_image", url)}
                folder="ruas"
                label="imagem"
              />
              <div className="grid grid-cols-2 gap-4">
                <div><label className={label}>URL da imagem</label><input className={input} {...bind("hero_image")} /></div>
                <div>
                  <label className={label}>Texto alternativo (alt) *</label>
                  <input className={input} placeholder="Ex.: Vista da Alameda Rio Negro em Alphaville" {...bind("hero_image_alt")} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg text-ink">Galeria</h2>
                <label className="text-xs uppercase tracking-widest border border-ink/20 px-3 py-1.5 hover:bg-ink/5 cursor-pointer">
                  Adicionar imagens
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => { void addGalleryFiles(e.target.files); e.currentTarget.value = ""; }} />
                </label>
              </div>
              {form.gallery_images.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma imagem na galeria.</p>}
              <div className="space-y-3">
                {form.gallery_images.map((g, i) => (
                  <div key={g.url + i} className="flex gap-4 border border-ink/10 p-3">
                    <img src={g.url} alt={g.alt} className="h-24 w-32 object-cover border border-ink/10" />
                    <div className="flex-1 space-y-2">
                      <div>
                        <label className={label}>Texto alternativo (alt)</label>
                        <input className={input} value={g.alt} onChange={(e) => updateGallery(i, { alt: e.target.value })} />
                      </div>
                      <div>
                        <label className={label}>Legenda / crédito</label>
                        <input className={input} value={g.caption} onChange={(e) => updateGallery(i, { caption: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => moveGallery(i, -1)} className="border border-ink/15 px-2 text-xs">↑</button>
                      <button onClick={() => moveGallery(i, 1)} className="border border-ink/15 px-2 text-xs">↓</button>
                      <button
                        onClick={() => set("gallery_images", form.gallery_images.filter((_, idx) => idx !== i))}
                        className="text-[11px] uppercase tracking-widest text-red-600"
                      >Excluir</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "seo" && (
          <section className="space-y-4">
            <h2 className="font-serif text-lg text-ink">SEO</h2>
            <div><label className={label}>H1</label><input className={input} {...bind("h1")} /></div>
            <div>
              <label className={label}>Title (SEO) — {form.seo_title.length} caracteres</label>
              <input className={input} {...bind("seo_title")} />
            </div>
            <div>
              <label className={label}>Meta description — {form.seo_description.length} caracteres</label>
              <textarea rows={3} className={input} {...bind("seo_description")} />
            </div>
            <div><label className={label}>Palavras-chave</label><input className={input} {...bind("seo_keywords")} /></div>
            <div><label className={label}>Canonical (opcional)</label><input className={input} {...bind("canonical_url")} /></div>
          </section>
        )}

        {tab === "publicacao" && (
          <section className="space-y-4">
            <h2 className="font-serif text-lg text-ink">Publicação</h2>
            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <label className={label}>Status</label>
                <select className={input} {...bind("status")}>
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
                Destaque
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
                Ativa
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Para publicar é preciso: nome, slug, cidade ou bairro, descrição, título SEO e meta description.
            </p>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}
