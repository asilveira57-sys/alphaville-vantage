import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink, Pencil, Plus, X } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import {
  listDevelopmentPartnersAdmin,
  listEmpreendimentoOptions,
  upsertDevelopmentPartner,
  toggleDevelopmentPartner,
  type DevelopmentPartner,
} from "@/lib/development-partners.functions";

export const Route = createFileRoute("/_authenticated/admin-incorporadoras")({
  head: () => ({
    meta: [
      { title: "Admin · Incorporadoras parceiras — Portal S.A" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminIncorporadoras,
});

const input = "w-full border border-ink/15 bg-white px-3 py-2.5 text-sm";
const label = "mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground";
const btn =
  "border border-ink/20 px-3 py-1.5 text-[10px] uppercase tracking-widest hover:bg-ink/5 disabled:opacity-40";
const btnPrimary =
  "bg-brand-yellow text-brand-dark px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:brightness-95 disabled:opacity-40";

type FormState = {
  id?: string;
  name: string;
  slug: string;
  logo_url: string;
  description: string;
  empreendimento_slugs: string[];
  active: boolean;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  logo_url: "",
  description: "",
  empreendimento_slugs: [],
  active: true,
};

function AdminIncorporadoras() {
  const qc = useQueryClient();
  const listFn = useServerFn(listDevelopmentPartnersAdmin);
  const optionsFn = useServerFn(listEmpreendimentoOptions);
  const upsertFn = useServerFn(upsertDevelopmentPartner);
  const toggleFn = useServerFn(toggleDevelopmentPartner);

  const partners = useQuery({ queryKey: ["admin", "incorporadoras"], queryFn: () => listFn({}) });
  const empreendimentos = useQuery({
    queryKey: ["admin", "empreendimento-options"],
    queryFn: () => optionsFn({}),
  });

  const [editing, setEditing] = useState<FormState | null>(null);

  const save = useMutation({
    mutationFn: (f: FormState) =>
      upsertFn({
        data: {
          id: f.id,
          name: f.name,
          slug: f.slug,
          logo_url: f.logo_url,
          description: f.description,
          empreendimento_slugs: f.empreendimento_slugs,
          active: f.active,
        },
      }),
    onSuccess: (r) => {
      toast.success(`Parceiro salvo. Página: /parceiros/${r.slug}`);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "incorporadoras"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggleFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "incorporadoras"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => partners.data ?? [], [partners.data]);

  const startEdit = (p: DevelopmentPartner) =>
    setEditing({
      id: p.id,
      name: p.name,
      slug: p.slug,
      logo_url: p.logo_url ?? "",
      description: p.description ?? "",
      empreendimento_slugs: p.empreendimento_slugs ?? [],
      active: p.active,
    });

  const toggleSlug = (slug: string) =>
    setEditing((f) =>
      f
        ? {
            ...f,
            empreendimento_slugs: f.empreendimento_slugs.includes(slug)
              ? f.empreendimento_slugs.filter((s) => s !== slug)
              : [...f.empreendimento_slugs, slug],
          }
        : f,
    );

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-8 border-b border-ink/10 pb-6">
          <Link
            to="/admin"
            className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-ink"
          >
            ← Admin
          </Link>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl">Incorporadoras parceiras</h1>
              <p className="mt-2 max-w-[74ch] text-sm text-muted-foreground">
                Cada parceiro ganha uma página pública em <code>/parceiros/nome-do-parceiro</code>{" "}
                com os empreendimentos vinculados e formulário de captação de leads.
              </p>
            </div>
            <button type="button" className={btnPrimary} onClick={() => setEditing({ ...emptyForm })}>
              <Plus className="mr-1 inline h-3.5 w-3.5" /> Novo parceiro
            </button>
          </div>
        </header>

        {/* ------------------------------------------------ formulário */}
        {editing && (
          <form
            className="mb-10 grid gap-5 border border-ink/15 bg-ink/[0.02] p-6"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(editing);
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl">
                {editing.id ? "Editar parceiro" : "Novo parceiro"}
              </h2>
              <button type="button" onClick={() => setEditing(null)} aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="inc-name">Nome da incorporadora</label>
                <input
                  id="inc-name"
                  required
                  className={input}
                  placeholder="Ex.: MPD, Cyrela, Even…"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div>
                <label className={label} htmlFor="inc-slug">
                  Endereço da página (slug) — opcional
                </label>
                <input
                  id="inc-slug"
                  className={input}
                  placeholder="Gerado a partir do nome se vazio"
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                />
                {editing.name && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    /parceiros/{(editing.slug || editing.name)
                      .normalize("NFD").replace(/[̀-ͯ]/g, "")
                      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className={label} htmlFor="inc-logo">URL do logotipo (opcional)</label>
                <input
                  id="inc-logo"
                  className={input}
                  placeholder="https://…"
                  value={editing.logo_url}
                  onChange={(e) => setEditing({ ...editing, logo_url: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={label} htmlFor="inc-desc">Descrição (opcional)</label>
                <textarea
                  id="inc-desc"
                  rows={3}
                  className={input}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
            </div>

            <div>
              <p className={label}>Empreendimentos vinculados</p>
              {empreendimentos.isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : (empreendimentos.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum empreendimento cadastrado ainda — crie em{" "}
                  <Link to="/admin-empreendimentos" className="underline">
                    Empreendimentos
                  </Link>
                  .
                </p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {(empreendimentos.data ?? []).map((emp) => (
                    <li key={emp.slug}>
                      <label className="flex cursor-pointer items-center gap-2 border border-ink/10 bg-white px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#F2DA00]"
                          checked={editing.empreendimento_slugs.includes(emp.slug)}
                          onChange={() => toggleSlug(emp.slug)}
                        />
                        <span className="min-w-0 flex-1 truncate">{emp.title}</span>
                        {emp.status !== "published" && (
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                            {emp.status === "draft" ? "rascunho" : emp.status}
                          </span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Só empreendimentos publicados aparecem na página pública do parceiro.
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#F2DA00]"
                checked={editing.active}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              />
              Página ativa (visível publicamente)
            </label>

            <div className="flex gap-2">
              <button type="submit" disabled={save.isPending} className={btnPrimary}>
                {save.isPending ? "Salvando…" : "Salvar parceiro"}
              </button>
              <button type="button" className={btn} onClick={() => setEditing(null)}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* ------------------------------------------------ página fixa MPD */}
        <div className="mb-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Página fixa do site
          </p>
          <ul className="border border-ink/10">
            <li className="flex flex-wrap items-center justify-between gap-4 bg-ink/[0.03] p-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">MPD</span>
                  <span className="border border-ink/20 px-2 py-0.5 text-[9px] uppercase tracking-widest">
                    Página fixa
                  </span>
                  <span className="border border-ink/20 px-2 py-0.5 text-[9px] uppercase tracking-widest">
                    Ativo
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  /parceiros/mpd · 4 empreendimentos (Andrômeda, Terrah, Florá e Neo Alphaville)
                </p>
              </div>
              <a
                href="/parceiros/mpd"
                target="_blank"
                rel="noreferrer"
                className={btn}
              >
                <ExternalLink className="mr-1 inline h-3 w-3" /> Ver página
              </a>
            </li>
          </ul>
        </div>

        {/* ------------------------------------------------ lista */}
        {partners.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : rows.length === 0 ? (
          <p className="border border-ink/10 p-8 text-center text-sm text-muted-foreground">
            Nenhum parceiro cadastrado no painel. Clique em "Novo parceiro" para criar o primeiro.
          </p>
        ) : (
          <ul className="divide-y divide-ink/10 border border-ink/10">
            {rows.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  {p.logo_url ? (
                    <img src={p.logo_url} alt="" className="h-10 w-10 shrink-0 object-contain" />
                  ) : null}
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{p.name}</span>
                      <span
                        className={`border px-2 py-0.5 text-[9px] uppercase tracking-widest ${
                          p.active ? "border-ink/20" : "border-red-300 text-red-700"
                        }`}
                      >
                        {p.active ? "Ativo" : "Inativo"}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      /parceiros/{p.slug} · {p.empreendimento_slugs.length} empreendimento(s)
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/parceiros/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className={btn}
                  >
                    <ExternalLink className="mr-1 inline h-3 w-3" /> Ver página
                  </a>
                  <button type="button" className={btn} onClick={() => startEdit(p)}>
                    <Pencil className="mr-1 inline h-3 w-3" /> Editar
                  </button>
                  <button
                    type="button"
                    className={btn}
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate({ id: p.id, active: !p.active })}
                  >
                    {p.active ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SiteLayout>
  );
}
