import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site-layout";
import { STREET_TYPES, upsertStreet, deleteStreet } from "@/lib/streets.functions";

export const Route = createFileRoute("/_authenticated/admin-ruas/$id")({
  head: () => ({ meta: [{ title: "Editar rua — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: EditRua,
});

type Form = {
  name: string; official_name: string; street_type: string;
  neighborhood: string; city: string; state: string;
  postal_code_start: string; postal_code_end: string;
  short_description: string; description: string;
  hero_image: string; seo_title: string; seo_description: string; h1: string;
  featured: boolean; status: "draft" | "published" | "archived";
  slug: string;
};

const empty: Form = {
  name: "", official_name: "", street_type: "rua",
  neighborhood: "", city: "", state: "SP",
  postal_code_start: "", postal_code_end: "",
  short_description: "", description: "",
  hero_image: "", seo_title: "", seo_description: "", h1: "",
  featured: false, status: "draft", slug: "",
};

function EditRua() {
  const { id } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertStreet);
  const deleteFn = useServerFn(deleteStreet);

  const streetQ = useQuery({
    queryKey: ["admin-street", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("streets").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const [form, setForm] = useState<Form>(empty);
  useEffect(() => {
    if (streetQ.data) {
      const d: any = streetQ.data;
      setForm({
        name: d.name ?? "", official_name: d.official_name ?? "", street_type: d.street_type ?? "rua",
        neighborhood: d.neighborhood ?? "", city: d.city ?? "", state: d.state ?? "SP",
        postal_code_start: d.postal_code_start ?? "", postal_code_end: d.postal_code_end ?? "",
        short_description: d.short_description ?? "", description: d.description ?? "",
        hero_image: d.hero_image ?? "", seo_title: d.seo_title ?? "", seo_description: d.seo_description ?? "",
        h1: d.h1 ?? "", featured: !!d.featured, status: d.status ?? "draft", slug: d.slug ?? "",
      });
    }
  }, [streetQ.data]);

  const saveMut = useMutation({
    mutationFn: () => upsertFn({ data: { id, ...form, street_type: form.street_type as any } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-street", id] });
      qc.invalidateQueries({ queryKey: ["admin-streets"] });
    },
  });

  const delMut = useMutation({
    mutationFn: () => deleteFn({ data: { id } }),
    onSuccess: () => router.navigate({ to: "/admin-ruas" }),
  });

  if (streetQ.isLoading) return <SiteLayout><div className="px-6 py-24 text-sm text-muted-foreground">Carregando…</div></SiteLayout>;
  if (!streetQ.data) return <SiteLayout><div className="px-6 py-24 text-sm text-muted-foreground text-center">Rua não encontrada. <Link to="/admin-ruas" className="underline">Voltar</Link></div></SiteLayout>;

  const bind = <K extends keyof Form>(k: K) => ({
    value: form[k] as any,
    onChange: (e: any) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value })),
  });

  const input = "w-full border border-ink/15 px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-ink";
  const label = "block text-[10px] uppercase tracking-widest text-muted-foreground mb-1";

  return (
    <SiteLayout>
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-8">
        <div className="flex items-end justify-between">
          <div>
            <Link to="/admin-ruas" className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-ink">← Ruas</Link>
            <h1 className="font-serif text-3xl text-ink mt-2">{form.name || "Nova rua"}</h1>
            {form.slug && <p className="text-xs text-muted-foreground mt-1">/ruas/{form.slug}</p>}
          </div>
          <div className="flex gap-2">
            {form.status === "published" && (
              <a href={`/ruas/${form.slug}`} target="_blank" rel="noreferrer" className="border border-ink/20 px-4 py-2 text-xs uppercase tracking-widest hover:bg-ink/5">Ver ao vivo →</a>
            )}
            <button onClick={() => { if (confirm("Excluir esta rua?")) delMut.mutate(); }} className="border border-red-600/40 text-red-600 px-4 py-2 text-xs uppercase tracking-widest hover:bg-red-50">Excluir</button>
            <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="bg-ink text-canvas px-5 py-2 text-xs uppercase tracking-widest hover:bg-ink/85 disabled:opacity-50">
              {saveMut.isPending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>

        {saveMut.error && <p className="text-xs text-red-600">{(saveMut.error as Error).message}</p>}
        {saveMut.isSuccess && <p className="text-xs text-emerald-700">Salvo.</p>}

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
          <h2 className="font-serif text-lg text-ink">Conteúdo</h2>
          <div>
            <label className={label}>Descrição curta</label>
            <textarea rows={2} className={input} {...bind("short_description")} />
          </div>
          <div>
            <label className={label}>Descrição completa</label>
            <textarea rows={8} className={input} {...bind("description")} />
          </div>
          <div>
            <label className={label}>Imagem hero (URL)</label>
            <input className={input} {...bind("hero_image")} />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-serif text-lg text-ink">SEO</h2>
          <div><label className={label}>H1</label><input className={input} {...bind("h1")} /></div>
          <div><label className={label}>Title (SEO)</label><input className={input} {...bind("seo_title")} /></div>
          <div><label className={label}>Meta description</label><textarea rows={2} className={input} {...bind("seo_description")} /></div>
        </section>

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
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} />
              Destaque na página inicial
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Para publicar é preciso: nome, slug, cidade ou bairro, descrição, título SEO e meta description.
          </p>
        </section>
      </div>
    </SiteLayout>
  );
}
