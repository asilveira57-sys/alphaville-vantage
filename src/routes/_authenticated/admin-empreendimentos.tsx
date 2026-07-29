import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site-layout";
import { checkIsAdmin } from "@/lib/admin.functions";
import { uploadEditorialImageFile } from "@/components/image-upload";
import { MPD_EMPREENDIMENTOS } from "@/lib/empreendimentos-mpd";
import { PLAN_CATEGORIES } from "@/components/empreendimentos/plans-block";

export const Route = createFileRoute("/_authenticated/admin-empreendimentos")({
  head: () => ({
    meta: [{ title: "Empreendimentos — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminEmpreendimentos,
});

type MediaRow = {
  id: string;
  url: string;
  title: string | null;
  caption: string | null;
  alt_text: string | null;
  credit: string | null;
  source: string | null;
  sort_order: number;
  is_cover: boolean;
  active: boolean;
};

type PlanRow = {
  id: string;
  kind: string;
  category: string | null;
  title: string | null;
  area_label: string | null;
  description: string | null;
  image_url: string | null;
  thumb_url: string | null;
  embed_url: string | null;
  credit: string | null;
  source: string | null;
  sort_order: number;
  active: boolean;
};

const input =
  "w-full border border-ink/15 px-3 py-2 text-sm bg-canvas focus:outline-none focus:border-ink";
const label = "block text-[10px] uppercase tracking-widest text-muted-foreground mb-1";
const btn =
  "text-xs uppercase tracking-widest border border-ink/20 px-3 py-1.5 hover:bg-ink/5 disabled:opacity-50";

function AdminEmpreendimentos() {
  const checkFn = useServerFn(checkIsAdmin);
  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkFn() });
  const [slug, setSlug] = useState(MPD_EMPREENDIMENTOS[0]?.slug ?? "");

  if (adminQ.isLoading)
    return (
      <SiteLayout>
        <div className="px-6 py-24 text-sm text-muted-foreground">Carregando…</div>
      </SiteLayout>
    );

  if (!adminQ.data?.isAdmin)
    return (
      <SiteLayout>
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="font-serif text-3xl text-ink">Sem permissão admin</h1>
          <Link to="/admin" className="mt-6 inline-block text-xs uppercase tracking-widest underline">
            Voltar ao Admin
          </Link>
        </div>
      </SiteLayout>
    );

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Admin</p>
            <h1 className="font-serif text-3xl text-ink">Empreendimentos — mídia</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Galeria de fotos, plantas, implantação e tour virtual. Não altera o conteúdo já publicado
              das páginas.
            </p>
          </div>
          <Link to="/admin" className={btn}>
            ← Admin
          </Link>
        </div>

        <div className="mb-8">
          <label className={label}>Empreendimento</label>
          <select value={slug} onChange={(e) => setSlug(e.target.value)} className={input}>
            {MPD_EMPREENDIMENTOS.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.name} ({e.slug})
              </option>
            ))}
          </select>
        </div>

        {slug && (
          <>
            <GallerySection slug={slug} />
            <PlansSection slug={slug} />
          </>
        )}
      </div>
    </SiteLayout>
  );
}

/* ---------------- Galeria ---------------- */

function GallerySection({ slug }: { slug: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["empMedia", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empreendimento_media")
        .select("*")
        .eq("empreendimento_slug", slug)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as MediaRow[];
    },
  });

  const rows = q.data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["empMedia", slug] });

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setErr(null);
    try {
      let order = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
      for (const f of Array.from(files)) {
        const url = await uploadEditorialImageFile(f, `empreendimentos/${slug}`);
        const { error } = await supabase.from("empreendimento_media").insert({
          empreendimento_slug: slug,
          url,
          title: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
          sort_order: order++,
        });
        if (error) throw new Error(error.message);
      }
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function patch(id: string, values: Partial<MediaRow>) {
    const { error } = await supabase.from("empreendimento_media").update(values).eq("id", id);
    if (error) setErr(error.message);
    await refresh();
  }

  async function setCover(id: string) {
    await supabase
      .from("empreendimento_media")
      .update({ is_cover: false })
      .eq("empreendimento_slug", slug);
    await patch(id, { is_cover: true });
  }

  async function move(i: number, dir: -1 | 1) {
    const a = rows[i];
    const b = rows[i + dir];
    if (!a || !b) return;
    await supabase.from("empreendimento_media").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("empreendimento_media").update({ sort_order: a.sort_order }).eq("id", b.id);
    await refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remover esta imagem da galeria?")) return;
    await supabase.from("empreendimento_media").delete().eq("id", id);
    await refresh();
  }

  return (
    <section className="mb-14 border border-ink/10 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl text-ink">Galeria de fotos</h2>
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={btn}>
          {busy ? "Enviando…" : "Enviar imagens"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void upload(e.target.files)}
        />
      </div>
      {err && <p className="mb-3 text-xs text-red-600">{err}</p>}
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma imagem cadastrada para este empreendimento.</p>
      )}

      <div className="space-y-4">
        {rows.map((m, i) => (
          <div key={m.id} className="grid gap-4 border border-ink/10 p-3 md:grid-cols-[120px_1fr]">
            <div className="space-y-2">
              <img src={m.url} alt="" className="h-24 w-full border border-ink/10 object-cover" />
              <div className="flex gap-1">
                <button className={btn} onClick={() => void move(i, -1)} disabled={i === 0}>
                  ↑
                </button>
                <button className={btn} onClick={() => void move(i, 1)} disabled={i === rows.length - 1}>
                  ↓
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Título</label>
                <input
                  className={input}
                  defaultValue={m.title ?? ""}
                  onBlur={(e) => void patch(m.id, { title: e.target.value || null })}
                />
              </div>
              <div>
                <label className={label}>Texto alternativo (alt)</label>
                <input
                  className={input}
                  defaultValue={m.alt_text ?? ""}
                  onBlur={(e) => void patch(m.id, { alt_text: e.target.value || null })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Legenda</label>
                <input
                  className={input}
                  defaultValue={m.caption ?? ""}
                  onBlur={(e) => void patch(m.id, { caption: e.target.value || null })}
                />
              </div>
              <div>
                <label className={label}>Crédito</label>
                <input
                  className={input}
                  defaultValue={m.credit ?? ""}
                  onBlur={(e) => void patch(m.id, { credit: e.target.value || null })}
                />
              </div>
              <div>
                <label className={label}>Fonte</label>
                <input
                  className={input}
                  defaultValue={m.source ?? ""}
                  onBlur={(e) => void patch(m.id, { source: e.target.value || null })}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={m.active}
                    onChange={(e) => void patch(m.id, { active: e.target.checked })}
                  />
                  Ativo
                </label>
                <button
                  className={btn}
                  onClick={() => void setCover(m.id)}
                  disabled={m.is_cover}
                  type="button"
                >
                  {m.is_cover ? "Capa atual" : "Definir como capa"}
                </button>
                <button className={btn} type="button" onClick={() => void remove(m.id)}>
                  Remover
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Plantas / implantação / tour ---------------- */

function PlansSection({ slug }: { slug: string }) {
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["empPlans", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empreendimento_plans")
        .select("*")
        .eq("empreendimento_slug", slug)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as PlanRow[];
    },
  });

  const rows = q.data ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["empPlans", slug] });

  async function add() {
    const order = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
    const { error } = await supabase.from("empreendimento_plans").insert({
      empreendimento_slug: slug,
      kind: "planta",
      category: "planta-padrao",
      title: "Nova planta",
      sort_order: order,
    });
    if (error) setErr(error.message);
    await refresh();
  }

  async function patch(id: string, values: Partial<PlanRow>) {
    const { error } = await supabase.from("empreendimento_plans").update(values).eq("id", id);
    if (error) setErr(error.message);
    await refresh();
  }

  async function move(i: number, dir: -1 | 1) {
    const a = rows[i];
    const b = rows[i + dir];
    if (!a || !b) return;
    await supabase.from("empreendimento_plans").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("empreendimento_plans").update({ sort_order: a.sort_order }).eq("id", b.id);
    await refresh();
  }

  async function remove(id: string) {
    if (!confirm("Remover este item?")) return;
    await supabase.from("empreendimento_plans").delete().eq("id", id);
    await refresh();
  }

  return (
    <section className="mb-20 border border-ink/10 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl text-ink">Plantas, implantação e tour virtual</h2>
        <button type="button" className={btn} onClick={() => void add()}>
          + Adicionar item
        </button>
      </div>
      {err && <p className="mb-3 text-xs text-red-600">{err}</p>}
      {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>}

      <div className="space-y-4">
        {rows.map((p, i) => (
          <div key={p.id} className="grid gap-3 border border-ink/10 p-3 sm:grid-cols-2">
            <div>
              <label className={label}>Categoria</label>
              <select
                className={input}
                value={p.category ?? "planta-padrao"}
                onChange={(e) => {
                  const cat = PLAN_CATEGORIES.find((c) => c.value === e.target.value);
                  void patch(p.id, { category: e.target.value, kind: cat?.kind ?? "planta" });
                }}
              >
                {PLAN_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Título</label>
              <input
                className={input}
                defaultValue={p.title ?? ""}
                onBlur={(e) => void patch(p.id, { title: e.target.value || null })}
              />
            </div>
            <div>
              <label className={label}>Metragem</label>
              <input
                className={input}
                placeholder="Ex.: 240 m²"
                defaultValue={p.area_label ?? ""}
                onBlur={(e) => void patch(p.id, { area_label: e.target.value || null })}
              />
            </div>
            <div>
              <label className={label}>URL do tour / vídeo (embed)</label>
              <input
                className={input}
                placeholder="https://…"
                defaultValue={p.embed_url ?? ""}
                onBlur={(e) => void patch(p.id, { embed_url: e.target.value || null })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Descrição</label>
              <textarea
                className={input}
                rows={2}
                defaultValue={p.description ?? ""}
                onBlur={(e) => void patch(p.id, { description: e.target.value || null })}
              />
            </div>
            <PlanImageField
              label="Imagem"
              slug={slug}
              value={p.image_url}
              onChange={(url) => void patch(p.id, { image_url: url })}
            />
            <PlanImageField
              label="Miniatura"
              slug={slug}
              value={p.thumb_url}
              onChange={(url) => void patch(p.id, { thumb_url: url })}
            />
            <div>
              <label className={label}>Crédito</label>
              <input
                className={input}
                defaultValue={p.credit ?? ""}
                onBlur={(e) => void patch(p.id, { credit: e.target.value || null })}
              />
            </div>
            <div>
              <label className={label}>Fonte</label>
              <input
                className={input}
                defaultValue={p.source ?? ""}
                onBlur={(e) => void patch(p.id, { source: e.target.value || null })}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={p.active}
                  onChange={(e) => void patch(p.id, { active: e.target.checked })}
                />
                Ativo
              </label>
              <button className={btn} type="button" onClick={() => void move(i, -1)} disabled={i === 0}>
                ↑
              </button>
              <button
                className={btn}
                type="button"
                onClick={() => void move(i, 1)}
                disabled={i === rows.length - 1}
              >
                ↓
              </button>
              <button className={btn} type="button" onClick={() => void remove(p.id)}>
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlanImageField({
  label: text,
  slug,
  value,
  onChange,
}: {
  label: string;
  slug: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadEditorialImageFile(file, `empreendimentos/${slug}/plantas`);
      onChange(url);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div>
      <label className={label}>{text}</label>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="" className="h-14 w-14 border border-ink/10 object-cover" />
        ) : (
          <div className="grid h-14 w-14 place-items-center border border-dashed border-ink/20 text-[10px] text-muted-foreground">
            vazio
          </div>
        )}
        <button type="button" className={btn} disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? "Enviando…" : value ? "Trocar" : "Enviar"}
        </button>
        {value && (
          <button type="button" className={btn} onClick={() => onChange(null)}>
            Remover
          </button>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handle(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
