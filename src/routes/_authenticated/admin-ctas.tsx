import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { checkIsAdmin } from "@/lib/admin.functions";
import { CtaBlockView } from "@/components/cta-block-view";
import {
  CTA_CONTENT_TYPES,
  CTA_TYPES,
  CTA_TYPE_LABELS,
  CTA_VARIANTS,
  deleteCta,
  listCtaDefaults,
  listCtasForAdmin,
  setCtaDefault,
  upsertCta,
  type CtaBlock,
} from "@/lib/cta.functions";

export const Route = createFileRoute("/_authenticated/admin-ctas")({
  head: () => ({ meta: [{ title: "Admin · Gestão de CTAs — Portal S.A" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminCtas,
});

const EMPTY = {
  internal_name: "",
  title: "",
  description: "",
  button_label: "",
  button_url: "",
  secondary_button_label: "",
  secondary_button_url: "",
  image_url: "",
  cta_type: "atendimento_geral" as (typeof CTA_TYPES)[number],
  variant: "dark" as (typeof CTA_VARIANTS)[number],
  conversion_context: "",
  tracking_source: "",
  allowed_content_types: [] as string[],
  display_order: 0,
  active: true,
};

function AdminCtas() {
  const qc = useQueryClient();
  const checkFn = useServerFn(checkIsAdmin);
  const listFn = useServerFn(listCtasForAdmin);
  const upsertFn = useServerFn(upsertCta);
  const deleteFn = useServerFn(deleteCta);
  const defaultsFn = useServerFn(listCtaDefaults);
  const setDefaultFn = useServerFn(setCtaDefault);

  const [form, setForm] = useState<typeof EMPTY & { id?: string }>({ ...EMPTY });
  const [err, setErr] = useState<string | null>(null);

  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkFn() });
  const listQ = useQuery({ queryKey: ["ctas", "admin"], queryFn: () => listFn(), enabled: !!adminQ.data?.isAdmin });
  const defaultsQ = useQuery({ queryKey: ["ctas", "defaults"], queryFn: () => defaultsFn(), enabled: !!adminQ.data?.isAdmin });

  const saveMut = useMutation({
    mutationFn: () => upsertFn({ data: { ...form, description: form.description || null } as never }),
    onSuccess: () => { setForm({ ...EMPTY }); qc.invalidateQueries({ queryKey: ["ctas"] }); },
    onError: (e: Error) => setErr(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ctas"] }),
  });
  const defMut = useMutation({
    mutationFn: (v: { content_type: string; cta_id: string | null }) => setDefaultFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ctas", "defaults"] }),
  });

  if (adminQ.isLoading) return <SiteLayout><div className="px-6 py-24 text-sm text-muted-foreground">Carregando…</div></SiteLayout>;
  if (!adminQ.data?.isAdmin) return <SiteLayout><div className="px-6 py-24 text-center text-sm text-muted-foreground">Acesso restrito. <Link to="/admin" className="underline">Ir para o painel</Link>.</div></SiteLayout>;

  const defaults = new Map((defaultsQ.data ?? []).map((d) => [d.content_type, d.cta_id]));

  function edit(c: CtaBlock) {
    setForm({
      id: c.id,
      internal_name: c.internal_name,
      title: c.title,
      description: c.description ?? "",
      button_label: c.button_label ?? "",
      button_url: c.button_url ?? "",
      secondary_button_label: c.secondary_button_label ?? "",
      secondary_button_url: c.secondary_button_url ?? "",
      image_url: c.image_url ?? "",
      cta_type: c.cta_type as never,
      variant: c.variant as never,
      conversion_context: c.conversion_context ?? "",
      tracking_source: c.tracking_source ?? "",
      allowed_content_types: c.allowed_content_types ?? [],
      display_order: c.display_order,
      active: c.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
            <h1 className="font-serif text-3xl">Gestão de CTAs</h1>
            <p className="mt-1 text-xs text-muted-foreground">CTAs reutilizáveis em posts, guias, ruas, condomínios, parceiros e empreendimentos.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin" className="text-xs uppercase tracking-widest border border-ink/20 px-3 py-2 hover:bg-ink hover:text-canvas">Painel</Link>
            <Link to="/admin-midia" className="text-xs uppercase tracking-widest border border-ink/20 px-3 py-2 hover:bg-ink hover:text-canvas">Mídia</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <section>
            <h2 className="font-serif text-xl mb-4">{form.id ? "Editar CTA" : "Novo CTA"}</h2>
            <div className="space-y-3 text-sm">
              <F label="Nome interno"><input value={form.internal_name} onChange={(e) => setForm({ ...form, internal_name: e.target.value })} className="in" /></F>
              <F label="Título"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="in" /></F>
              <F label="Descrição"><textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="in" /></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Botão — texto"><input value={form.button_label} onChange={(e) => setForm({ ...form, button_label: e.target.value })} className="in" /></F>
                <F label="Botão — URL"><input value={form.button_url} onChange={(e) => setForm({ ...form, button_url: e.target.value })} className="in" placeholder="/imoveis" /></F>
                <F label="2º botão — texto"><input value={form.secondary_button_label} onChange={(e) => setForm({ ...form, secondary_button_label: e.target.value })} className="in" /></F>
                <F label="2º botão — URL"><input value={form.secondary_button_url} onChange={(e) => setForm({ ...form, secondary_button_url: e.target.value })} className="in" /></F>
                <F label="Tipo de CTA">
                  <select value={form.cta_type} onChange={(e) => setForm({ ...form, cta_type: e.target.value as never })} className="in">
                    {CTA_TYPES.map((t) => <option key={t} value={t}>{CTA_TYPE_LABELS[t]}</option>)}
                  </select>
                </F>
                <F label="Variação visual">
                  <select value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value as never })} className="in">
                    {CTA_VARIANTS.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </F>
                <F label="Contexto de conversão"><input value={form.conversion_context} onChange={(e) => setForm({ ...form, conversion_context: e.target.value })} className="in" /></F>
                <F label="Origem (tracking)"><input value={form.tracking_source} onChange={(e) => setForm({ ...form, tracking_source: e.target.value })} className="in" /></F>
                <F label="Imagem/ícone (URL)"><input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="in" /></F>
                <F label="Ordem"><input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} className="in" /></F>
              </div>
              <F label="Tipos de conteúdo permitidos">
                <div className="flex flex-wrap gap-2">
                  {CTA_CONTENT_TYPES.map((t) => (
                    <label key={t} className="flex items-center gap-1 text-xs border border-ink/15 px-2 py-1">
                      <input type="checkbox" checked={form.allowed_content_types.includes(t)}
                        onChange={(e) => setForm({
                          ...form,
                          allowed_content_types: e.target.checked
                            ? [...form.allowed_content_types, t]
                            : form.allowed_content_types.filter((x) => x !== t),
                        })} />
                      {t}
                    </label>
                  ))}
                </div>
              </F>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo
              </label>
              {err && <p className="text-xs text-red-600">{err}</p>}
              <div className="flex gap-2">
                <button disabled={saveMut.isPending || !form.internal_name || !form.title} onClick={() => { setErr(null); saveMut.mutate(); }}
                  className="text-xs uppercase tracking-widest bg-ink text-canvas px-4 py-2 disabled:opacity-50">
                  {saveMut.isPending ? "Salvando…" : form.id ? "Salvar alterações" : "Criar CTA"}
                </button>
                {form.id && <button onClick={() => setForm({ ...EMPTY })} className="text-xs uppercase tracking-widest border border-ink/20 px-4 py-2">Cancelar</button>}
              </div>
            </div>

            {(form.title || form.description) && (
              <div className="mt-8">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Pré-visualização</p>
                <div className="border border-ink/10">
                  <CtaBlockView
                    title={form.title}
                    text={form.description}
                    buttonLabel={form.button_label}
                    buttonUrl={form.button_url}
                    secondaryLabel={form.secondary_button_label}
                    secondaryUrl={form.secondary_button_url}
                    variant={form.variant}
                  />
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className="font-serif text-xl mb-4">CTAs cadastrados</h2>
            {listQ.isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
              <ul className="divide-y divide-ink/10 border-y border-ink/10">
                {(listQ.data ?? []).map((c) => (
                  <li key={c.id} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{c.internal_name} {!c.active && <span className="text-[10px] uppercase text-amber-600">inativo</span>}</p>
                      <p className="text-xs text-muted-foreground">{c.title}</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{CTA_TYPE_LABELS[c.cta_type] ?? c.cta_type}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => edit(c)} className="text-[11px] uppercase tracking-widest border border-ink/20 px-2 py-1">Editar</button>
                      <button onClick={() => delMut.mutate(c.id)} className="text-[11px] uppercase tracking-widest border border-red-300 text-red-600 px-2 py-1">Excluir</button>
                    </div>
                  </li>
                ))}
                {(listQ.data ?? []).length === 0 && <li className="py-4 text-sm text-muted-foreground">Nenhum CTA cadastrado.</li>}
              </ul>
            )}

            <h2 className="font-serif text-xl mt-10 mb-4">CTA padrão por tipo de conteúdo</h2>
            <div className="space-y-2">
              {["site", ...CTA_CONTENT_TYPES].map((ct) => (
                <div key={ct} className="flex items-center gap-3">
                  <span className="text-xs w-36 uppercase tracking-widest text-muted-foreground">{ct === "site" ? "Geral do site" : ct}</span>
                  <select
                    value={defaults.get(ct) ?? ""}
                    onChange={(e) => defMut.mutate({ content_type: ct, cta_id: e.target.value || null })}
                    className="flex-1 border border-ink/15 px-2 py-1.5 text-sm bg-transparent"
                  >
                    <option value="">— nenhum —</option>
                    {(listQ.data ?? []).filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.internal_name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </SiteLayout>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</span>
      <div className="[&_.in]:w-full [&_.in]:border [&_.in]:border-ink/15 [&_.in]:px-2 [&_.in]:py-1.5 [&_.in]:bg-transparent">{children}</div>
    </label>
  );
}
