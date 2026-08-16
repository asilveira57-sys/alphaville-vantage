import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { CondoTriage } from "@/components/admin/condo-triage";

import {
  listCondominiumOverview,
  createCondominium,
  updateCondominium,
  assignAliasToCondominium,
  markAliasNotCondominium,
  mergeCondominiums,
  createCondominiumGuide,
  type CondoGroup,
} from "@/lib/condominiums-admin.functions";


export const Route = createFileRoute("/_authenticated/admin-condominios")({
  head: () => ({
    meta: [
      { title: "Admin · Central de condomínios — Portal S.A" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminCondominios,
});

const btn = "border border-ink/20 px-3 py-1.5 text-[10px] uppercase tracking-widest hover:bg-ink/5 disabled:opacity-40";
const input = "w-full border border-ink/15 bg-white px-3 py-2 text-sm";

function AdminCondominios() {
  const qc = useQueryClient();
  const overviewFn = useServerFn(listCondominiumOverview);
  const [tab, setTab] = useState<"condos" | "unclassified">("condos");
  const [q, setQ] = useState("");

  const overview = useQuery({ queryKey: ["admin", "condominios"], queryFn: () => overviewFn({}) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "condominios"] });
    qc.invalidateQueries({ queryKey: ["admin", "condo-props"] });
  };

  const condos = overview.data?.condos ?? [];
  const unclassified = overview.data?.unclassified ?? [];
  const stats = overview.data?.stats;

  const filteredCondos = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? condos.filter((c) => c.name.toLowerCase().includes(n)) : condos;
  }, [condos, q]);

  const filteredAliases = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? unclassified.filter((a) => a.alias.toLowerCase().includes(n)) : unclassified;
  }, [unclassified, q]);

  return (
    <SiteLayout>
      <section className="px-6 py-12 max-w-6xl mx-auto space-y-8">
        <header className="space-y-3">
          <Link to="/admin-mapa" className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-ink">
            ← Mapa do sistema
          </Link>
          <h1 className="font-serif text-3xl">Central de condomínios</h1>
          <p className="text-sm text-muted-foreground max-w-[70ch]">
            Cadastro oficial dos condomínios, limpeza dos nomes vindos do scrap, unificação de duplicados e criação
            automática do guia de cada condomínio.
          </p>
        </header>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              ["Condomínios oficiais", stats.condos],
              ["Com guia", stats.withGuide],
              ["Sem guia", stats.withoutGuide],
              ["Nomes não classificados", stats.unclassifiedNames],
              ["Imóveis vinculados", `${stats.linkedProps}/${stats.totalProps}`],
            ].map(([label, value]) => (
              <div key={String(label)} className="border border-ink/10 p-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setTab("condos")} className={`${btn} ${tab === "condos" ? "bg-ink text-canvas" : ""}`}>
            Condomínios ({condos.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("unclassified")}
            className={`${btn} ${tab === "unclassified" ? "bg-ink text-canvas" : ""}`}
          >
            Não classificados ({unclassified.length})
          </button>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className={`${input} max-w-xs`} />
        </div>

        {overview.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {overview.error && <p className="text-sm text-red-600">{(overview.error as Error).message}</p>}

        {tab === "condos" ? (
          <CondosTab condos={filteredCondos} allCondos={condos} onDone={refresh} />
        ) : (
          <UnclassifiedTab aliases={filteredAliases} condos={condos} onDone={refresh} />
        )}
      </section>
    </SiteLayout>
  );
}

function NewCondoForm({ onDone, defaultName = "" }: { onDone: () => void; defaultName?: string }) {
  const createFn = useServerFn(createCondominium);
  const [name, setName] = useState(defaultName);
  const [region, setRegion] = useState("");
  const m = useMutation({
    mutationFn: () => createFn({ data: { name, region: region.trim() || null, alias: defaultName || null } }),
    onSuccess: () => {
      toast.success("Condomínio criado");
      setName("");
      setRegion("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="flex flex-wrap items-end gap-3 border border-ink/10 p-4">
      <div className="min-w-[220px] flex-1">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Novo condomínio</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="Nome oficial" />
      </div>
      <div className="min-w-[160px]">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Região/bairro</label>
        <input value={region} onChange={(e) => setRegion(e.target.value)} className={input} placeholder="Alphaville" />
      </div>
      <button type="button" className={btn} disabled={name.trim().length < 2 || m.isPending} onClick={() => m.mutate()}>
        {m.isPending ? "Criando…" : "Criar"}
      </button>
    </div>
  );
}

function CondosTab({ condos, allCondos, onDone }: { condos: CondoGroup[]; allCondos: CondoGroup[]; onDone: () => void }) {
  const guideFn = useServerFn(createCondominiumGuide);
  const mergeFn = useServerFn(mergeCondominiums);
  const updateFn = useServerFn(updateCondominium);
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [mergeTarget, setMergeTarget] = useState("");

  const guide = useMutation({
    mutationFn: (id: string) => guideFn({ data: { condominiumId: id } }),
    onSuccess: (r) => {
      toast.success(r.created ? "Guia criado como rascunho" : "Guia já existia");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const merge = useMutation({
    mutationFn: () => mergeFn({ data: { targetId: mergeTarget, sourceIds: selected.filter((id) => id !== mergeTarget) } }),
    onSuccess: (r) => {
      toast.success(`Unificado: ${r.moved} imóveis movidos, ${r.redirects} redirecionamentos`);
      setSelected([]);
      setMergeTarget("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rename = useMutation({
    mutationFn: (v: { id: string; name: string; region: string | null }) => updateFn({ data: v }),
    onSuccess: () => {
      toast.success("Atualizado");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="space-y-5">
      <NewCondoForm onDone={onDone} />

      {selected.length > 1 && (
        <div className="flex flex-wrap items-end gap-3 border border-ink/20 bg-ink/[0.03] p-4">
          <p className="text-sm">Unificar {selected.length} condomínios em:</p>
          <select value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)} className={`${input} max-w-xs`}>
            <option value="">Selecione o condomínio principal</option>
            {allCondos.filter((c) => selected.includes(c.id)).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button type="button" className={btn} disabled={!mergeTarget || merge.isPending} onClick={() => merge.mutate()}>
            {merge.isPending ? "Unificando…" : "Unificar"}
          </button>
          <button type="button" className={btn} onClick={() => setSelected([])}>Limpar</button>
        </div>
      )}

      <ul className="divide-y divide-ink/10 border border-ink/10">
        {condos.map((c) => (
          <li key={c.id} className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} className="h-4 w-4" aria-label={`Selecionar ${c.name}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[c.region, `${c.propertiesCount} imóveis`, c.aliases.length ? `${c.aliases.length} apelidos` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {c.guideId ? (
                <span className="text-[10px] uppercase tracking-widest text-emerald-700">
                  Guia {c.guideStatus === "published" ? "publicado" : "rascunho"}
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-widest text-amber-700">Sem guia</span>
              )}
              {c.guideId ? (
                <Link to="/cms/$id" params={{ id: c.guideId }} className={btn}>Editar guia</Link>
              ) : (
                <button type="button" className={btn} disabled={guide.isPending} onClick={() => guide.mutate(c.id)}>
                  Criar guia
                </button>
              )}
              <button type="button" className={btn} onClick={() => setOpen(open === c.id ? null : c.id)}>
                {open === c.id ? "Fechar" : "Imóveis"}
              </button>
            </div>

            {open === c.id && (
              <div className="space-y-4 border-t border-ink/10 pt-4">
                <RenameRow condo={c} onSave={(name, region) => rename.mutate({ id: c.id, name, region })} />
                <GroupProperties condominiumId={c.id} alias={null} condos={allCondos} onDone={onDone} />
              </div>
            )}
          </li>
        ))}
        {condos.length === 0 && <li className="p-6 text-sm text-muted-foreground">Nenhum condomínio cadastrado ainda.</li>}
      </ul>
    </div>
  );
}

function RenameRow({ condo, onSave }: { condo: CondoGroup; onSave: (name: string, region: string | null) => void }) {
  const [name, setName] = useState(condo.name);
  const [region, setRegion] = useState(condo.region ?? "");
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[220px] flex-1">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Nome oficial</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
      </div>
      <div className="min-w-[160px]">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Região</label>
        <input value={region} onChange={(e) => setRegion(e.target.value)} className={input} />
      </div>
      <button type="button" className={btn} onClick={() => onSave(name.trim(), region.trim() || null)}>Salvar</button>
    </div>
  );
}

function GroupProperties({
  condominiumId,
  alias,
  condos,
  onDone,
}: {
  condominiumId: string | null;
  alias: string | null;
  condos: CondoGroup[];
  onDone: () => void;
}) {
  return <CondoTriage condominiumId={condominiumId} alias={alias} condos={condos} onDone={onDone} />;
}


function UnclassifiedTab({
  aliases,
  condos,
  onDone,
}: {
  aliases: { alias: string; count: number; suggestion: { id: string; name: string } | null }[];
  condos: CondoGroup[];
  onDone: () => void;
}) {
  const assignFn = useServerFn(assignAliasToCondominium);
  const notFn = useServerFn(markAliasNotCondominium);
  const [open, setOpen] = useState<string | null>(null);
  const [choice, setChoice] = useState<Record<string, string>>({});

  const assign = useMutation({
    mutationFn: (v: { alias: string; condominiumId: string }) => assignFn({ data: v }),
    onSuccess: (r) => {
      toast.success(`${r.moved} imóveis vinculados`);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const notCondo = useMutation({
    mutationFn: (aliasValue: string) => notFn({ data: { alias: aliasValue } }),
    onSuccess: (r) => {
      toast.success(`${r.cleared} imóveis limpos`);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground max-w-[75ch]">
        Nomes que vieram do scrap e ainda não pertencem a um condomínio oficial. Vincule a um condomínio existente, crie
        um novo ou marque como “não é condomínio” para limpar o campo dos imóveis.
      </p>
      <NewCondoForm onDone={onDone} />
      <ul className="divide-y divide-ink/10 border border-ink/10">
        {aliases.map((a) => (
          <li key={a.alias} className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{a.alias}</p>
                <p className="text-xs text-muted-foreground">
                  {a.count} imóveis{a.suggestion ? ` · sugestão: ${a.suggestion.name}` : ""}
                </p>
              </div>
              <select
                value={choice[a.alias] ?? a.suggestion?.id ?? ""}
                onChange={(e) => setChoice((c) => ({ ...c, [a.alias]: e.target.value }))}
                className={`${input} max-w-xs`}
              >
                <option value="">Vincular a…</option>
                {condos.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                className={btn}
                disabled={!(choice[a.alias] ?? a.suggestion?.id) || assign.isPending}
                onClick={() => {
                  if (
                    a.count > 25 &&
                    !window.confirm(
                      `Este grupo tem ${a.count} imóveis e pode misturar condomínios diferentes. Vincular todos mesmo assim? Prefira abrir “Imóveis” e triar por sugestão.`,
                    )
                  )
                    return;
                  assign.mutate({ alias: a.alias, condominiumId: (choice[a.alias] ?? a.suggestion?.id) as string });
                }}
              >
                Vincular todos
              </button>

              <button type="button" className={btn} disabled={notCondo.isPending} onClick={() => notCondo.mutate(a.alias)}>
                Não é condomínio
              </button>
              <button type="button" className={btn} onClick={() => setOpen(open === a.alias ? null : a.alias)}>
                {open === a.alias ? "Fechar" : "Imóveis"}
              </button>
            </div>
            {open === a.alias && <GroupProperties condominiumId={null} alias={a.alias} condos={condos} onDone={onDone} />}
          </li>
        ))}
        {aliases.length === 0 && <li className="p-6 text-sm text-muted-foreground">Nada pendente por aqui.</li>}
      </ul>
    </div>
  );
}
