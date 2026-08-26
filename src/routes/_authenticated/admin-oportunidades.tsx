import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import {
  listOpportunitiesForAdmin,
  searchPropertiesForOpportunity,
  saveOpportunity,
  SHOWCASE_MAX_PUBLISHED,
  type AdminOpportunityRow,
  type SaveOpportunityInput,
} from "@/lib/opportunities.functions";

export const Route = createFileRoute("/_authenticated/admin-oportunidades")({
  head: () => ({
    meta: [
      { title: "Admin · Vitrine de Oportunidades — Portal S.A" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminOportunidades,
});

const btn =
  "border border-ink/20 px-3 py-1.5 text-[10px] uppercase tracking-widest hover:bg-ink/5 disabled:opacity-40";
const btnPrimary =
  "bg-brand-yellow text-brand-dark px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:brightness-95 disabled:opacity-40";
const input = "w-full border border-ink/15 bg-white px-3 py-2 text-sm";
const label = "block text-[10px] uppercase tracking-widest text-muted-foreground mb-1";

const STATUS_LABEL: Record<string, string> = {
  none: "Fora da vitrine",
  draft: "Rascunho",
  published: "Publicado",
  paused: "Pausado",
  closed: "Encerrado",
};

const brl = (n: number | null) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(n);

const dateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

function AdminOportunidades() {
  const qc = useQueryClient();
  const listFn = useServerFn(listOpportunitiesForAdmin);
  const searchFn = useServerFn(searchPropertiesForOpportunity);
  const saveFn = useServerFn(saveOpportunity);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<AdminOpportunityRow[]>([]);
  const [editing, setEditing] = useState<AdminOpportunityRow | null>(null);

  const listQuery = useQuery({
    queryKey: ["admin", "oportunidades"],
    queryFn: () => listFn({}),
  });

  const rows = listQuery.data ?? [];
  const publishedCount = rows.filter((r) => r.opportunity_status === "published").length;

  const search = useMutation({
    mutationFn: (term: string) => searchFn({ data: { q: term } }),
    onSuccess: (data) => {
      setResults(data);
      if (!data.length) toast.info("Nenhum imóvel encontrado para esse termo.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: (payload: SaveOpportunityInput) => saveFn({ data: payload }),
    onSuccess: () => {
      toast.success("Vitrine atualizada.");
      setEditing(null);
      setResults([]);
      qc.invalidateQueries({ queryKey: ["admin", "oportunidades"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-6">
          <div>
            <Link
              to="/admin"
              className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-ink"
            >
              ← Admin
            </Link>
            <h1 className="font-serif mt-3 text-3xl">Vitrine de Oportunidades</h1>
            <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
              A curadoria da home e da rota <code>/oportunidades</code>. Os selos de preço são
              gerados pelo histórico do anúncio — aqui você define quem entra, em que ordem e até
              quando.
            </p>
          </div>
          <p className="text-sm">
            <span className="font-serif text-3xl">{publishedCount}</span>
            <span className="text-muted-foreground"> / {SHOWCASE_MAX_PUBLISHED} publicados</span>
          </p>
        </header>

        {/* ------------------------------------------------ vincular imóvel */}
        <section className="mb-12">
          <h2 className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            Vincular um imóvel do acervo
          </h2>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim().length >= 2) search.mutate(q.trim());
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Código, título, condomínio ou bairro"
              className={`${input} max-w-md flex-1`}
            />
            <button type="submit" className={btn} disabled={search.isPending}>
              {search.isPending ? "Buscando…" : "Buscar"}
            </button>
          </form>

          {results.length > 0 && (
            <ul className="mt-4 divide-y divide-ink/10 border border-ink/10">
              {results.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {[r.internal_code, r.condominium_name ?? r.neighborhood, r.city]
                        .filter(Boolean)
                        .join(" · ")}{" "}
                      · {brl(r.price_sale)}
                      {r.sqm_price ? ` · ${brl(r.sqm_price)}/m²` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={btn}
                    onClick={() => setEditing({ ...r, opportunity_status: "draft" })}
                  >
                    Adicionar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* --------------------------------------------------------- edição */}
        {editing && (
          <section className="mb-12 border border-ink/20 bg-ink/[0.02] p-6">
            <h2 className="font-serif mb-1 text-xl">{editing.title}</h2>
            <p className="mb-6 text-xs text-muted-foreground">
              {brl(editing.price_sale)}
              {editing.sqm_price ? ` · ${brl(editing.sqm_price)}/m²` : ""} ·{" "}
              <a
                href={`/imoveis/${editing.slug}`}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                ver ficha
              </a>
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={label} htmlFor="opp-status">
                  Situação
                </label>
                <select
                  id="opp-status"
                  className={input}
                  value={editing.opportunity_status}
                  onChange={(e) => setEditing({ ...editing, opportunity_status: e.target.value })}
                >
                  {Object.entries(STATUS_LABEL).map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={label} htmlFor="opp-rank">
                  Ordem na vitrine
                </label>
                <input
                  id="opp-rank"
                  type="number"
                  min={1}
                  max={99}
                  className={input}
                  value={editing.opportunity_rank ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      opportunity_rank: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>

              <div className="md:col-span-2">
                <label className={label} htmlFor="opp-headline">
                  Leitura da equipe (aparece no site)
                </label>
                <input
                  id="opp-headline"
                  className={input}
                  maxLength={180}
                  placeholder="Ex.: Único térreo com jardim privativo disponível no residencial hoje."
                  value={editing.opportunity_headline ?? ""}
                  onChange={(e) => setEditing({ ...editing, opportunity_headline: e.target.value })}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Descreva o imóvel e o motivo da seleção. Alegação de preço ou de escassez é
                  recusada pelo servidor — esses selos são gerados pelo sistema, com número e data.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className={label} htmlFor="opp-reason">
                  Nota interna (não aparece no site)
                </label>
                <textarea
                  id="opp-reason"
                  className={`${input} min-h-[80px]`}
                  maxLength={600}
                  value={editing.opportunity_reason ?? ""}
                  onChange={(e) => setEditing({ ...editing, opportunity_reason: e.target.value })}
                />
              </div>

              <div>
                <label className={label} htmlFor="opp-expires">
                  Validade da seleção
                </label>
                <input
                  id="opp-expires"
                  type="date"
                  className={input}
                  value={dateInput(editing.opportunity_expires_at)}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      opportunity_expires_at: e.target.value
                        ? new Date(`${e.target.value}T23:59:59`).toISOString()
                        : null,
                    })
                  }
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Sai da vitrine sozinho nesta data. Material vencido circulando é risco.
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                className={btnPrimary}
                disabled={save.isPending}
                onClick={() =>
                  save.mutate({
                    propertyId: editing.id,
                    status: editing.opportunity_status as
                      | "none"
                      | "draft"
                      | "published"
                      | "paused"
                      | "closed",
                    rank: editing.opportunity_rank,
                    headline: editing.opportunity_headline?.trim() || null,
                    reason: editing.opportunity_reason?.trim() || null,
                    expiresAt: editing.opportunity_expires_at,
                  })
                }
              >
                {save.isPending ? "Salvando…" : "Salvar"}
              </button>
              <button type="button" className={btn} onClick={() => setEditing(null)}>
                Cancelar
              </button>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------ curadoria */}
        <section>
          <h2 className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            Imóveis na curadoria
          </h2>

          {listQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum imóvel vinculado ainda. Use a busca acima para começar.
            </p>
          ) : (
            <ul className="divide-y divide-ink/10 border border-ink/10">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="truncate">{r.title}</span>
                      <span className="border border-ink/20 px-2 py-0.5 text-[9px] uppercase tracking-widest">
                        {STATUS_LABEL[r.opportunity_status] ?? r.opportunity_status}
                      </span>
                      {r.opportunity_rank ? (
                        <span className="text-[10px] text-muted-foreground">
                          ordem {r.opportunity_rank}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {brl(r.price_sale)}
                      {r.sqm_price ? ` · ${brl(r.sqm_price)}/m²` : ""}
                      {r.opportunity_expires_at
                        ? ` · vence em ${new Date(r.opportunity_expires_at).toLocaleDateString("pt-BR")}`
                        : ""}
                    </p>
                    {r.opportunity_headline ? (
                      <p className="mt-1 max-w-[70ch] truncate text-xs italic text-muted-foreground">
                        “{r.opportunity_headline}”
                      </p>
                    ) : null}
                  </div>
                  <button type="button" className={btn} onClick={() => setEditing(r)}>
                    Editar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </SiteLayout>
  );
}
