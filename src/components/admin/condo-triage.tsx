import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listGroupProperties,
  assignPropertiesToCondominium,
  createCondominium,
  type CondoGroup,
  type CondoPropertyRow,
} from "@/lib/condominiums-admin.functions";

const btn = "border border-ink/20 px-3 py-1.5 text-[10px] uppercase tracking-widest hover:bg-ink/5 disabled:opacity-40";
const input = "w-full border border-ink/15 bg-white px-3 py-2 text-sm";
const PAGE_SIZE = 30;

type Props = {
  condominiumId: string | null;
  alias: string | null;
  condos: CondoGroup[];
  onDone: () => void;
};

export function CondoTriage({ condominiumId, alias, condos, onDone }: Props) {
  const listFn = useServerFn(listGroupProperties);
  const assignFn = useServerFn(assignPropertiesToCondominium);
  const createFn = useServerFn(createCondominium);

  const [search, setSearch] = useState("");
  const [onlyWithoutSuggestion, setOnlyWithoutSuggestion] = useState(false);
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [grouped, setGrouped] = useState(false);
  const [newName, setNewName] = useState<Record<string, string>>({});
  const [undoAction, setUndoAction] = useState<{ ids: string[]; previous: string | null; label: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, onlyWithoutSuggestion, condominiumId, alias]);

  const q = useQuery({
    queryKey: ["admin", "condo-props", condominiumId, alias, search, onlyWithoutSuggestion, page],
    queryFn: () =>
      listFn({
        data: { condominiumId, alias, search, onlyWithoutSuggestion, page, pageSize: PAGE_SIZE },
      }),
  });

  const items = q.data?.items ?? [];
  const total = q.data?.total ?? 0;
  const buckets = q.data?.buckets ?? [];
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const assign = useMutation({
    mutationFn: (v: { propertyIds: string[]; condominiumId: string | null }) => assignFn({ data: v }),
    onSuccess: (r, v) => {
      toast.success(`${r.moved} imóvel(is) vinculado(s)`);
      setSel((s) => s.filter((id) => !v.propertyIds.includes(id)));
      q.refetch();
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = (ids: string[], toId: string | null, label: string) => {
    if (!ids.length) return;
    setUndoAction({ ids, previous: condominiumId, label });
    assign.mutate({ propertyIds: ids, condominiumId: toId });
  };

  const undo = useMutation({
    mutationFn: () => assignFn({ data: { propertyIds: undoAction!.ids, condominiumId: undoAction!.previous } }),
    onSuccess: () => {
      toast.success("Ação desfeita");
      setUndoAction(null);
      q.refetch();
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createAndAssign = useMutation({
    mutationFn: async (v: { name: string; propertyIds: string[] }) => {
      const created = await createFn({ data: { name: v.name, region: null, alias: null } });
      await assignFn({ data: { propertyIds: v.propertyIds, condominiumId: created.id } });
      return created;
    },
    onSuccess: () => {
      toast.success("Condomínio criado e imóvel vinculado");
      setNewName({});
      q.refetch();
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const condoOptions = useMemo(
    () => [...condos].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [condos],
  );

  const onDropCondo = (condoId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const dragged = e.dataTransfer.getData("text/plain");
    const ids = sel.includes(dragged) ? sel : [dragged];
    if (dragged) move(ids, condoId, "arrastar");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-muted-foreground">
          {total} imóveis {search || onlyWithoutSuggestion ? "(filtrados)" : ""}
        </p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, endereço ou código…"
          className={`${input} max-w-xs`}
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyWithoutSuggestion}
            onChange={(e) => setOnlyWithoutSuggestion(e.target.checked)}
            className="h-4 w-4"
          />
          Só sem sugestão
        </label>
        <button type="button" className={btn} onClick={() => setGrouped((g) => !g)}>
          {grouped ? "Ocultar blocos" : "Agrupar por sugestão"}
        </button>
        {undoAction && (
          <button type="button" className={btn} disabled={undo.isPending} onClick={() => undo.mutate()}>
            Desfazer ({undoAction.ids.length})
          </button>
        )}
      </div>

      {grouped && (
        <ul className="divide-y divide-ink/10 border border-ink/10 bg-ink/[0.02]">
          {buckets.map((b) => (
            <li key={b.condominiumId ?? "none"} className="flex flex-wrap items-center gap-3 p-3">
              <p className="min-w-0 flex-1 truncate text-sm">
                {b.label} <span className="text-xs text-muted-foreground">· {b.count} imóveis</span>
              </p>
              {b.condominiumId && (
                <button
                  type="button"
                  className={btn}
                  disabled={assign.isPending}
                  onClick={() => {
                    if (
                      b.count > 25 &&
                      !window.confirm(`Vincular ${b.count} imóveis a “${b.label}”? Confira antes — a ação é em lote.`)
                    )
                      return;
                    move(b.propertyIds, b.condominiumId, b.label);
                  }}
                >
                  Vincular todos deste bloco
                </button>
              )}
            </li>
          ))}
          {buckets.length === 0 && <li className="p-4 text-xs text-muted-foreground">Sem blocos.</li>}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={btn} onClick={() => setSel(items.map((p) => p.id))}>
          Selecionar página
        </button>
        <button type="button" className={btn} onClick={() => setSel([])}>
          Limpar
        </button>
        <select value={target} onChange={(e) => setTarget(e.target.value)} className={`${input} max-w-xs`}>
          <option value="">Mover selecionados para…</option>
          {condoOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={btn}
          disabled={!sel.length || !target || assign.isPending}
          onClick={() => move(sel, target, "seleção")}
        >
          Mover ({sel.length})
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        {q.isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando imóveis…</p>
        ) : (
          <ul className="divide-y divide-ink/10 border border-ink/10">
            {items.map((p) => (
              <PropertyRow
                key={p.id}
                p={p}
                condos={condoOptions}
                selected={sel.includes(p.id)}
                onToggle={() => toggle(p.id)}
                onAssign={(id, label) => move([p.id], id, label)}
                disabled={assign.isPending}
                newName={newName[p.id] ?? ""}
                setNewName={(v) => setNewName((s) => ({ ...s, [p.id]: v }))}
                onCreate={() => createAndAssign.mutate({ name: (newName[p.id] ?? "").trim(), propertyIds: [p.id] })}
                creating={createAndAssign.isPending}
              />
            ))}
            {items.length === 0 && <li className="p-4 text-xs text-muted-foreground">Nenhum imóvel neste filtro.</li>}
          </ul>
        )}

        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Arraste um imóvel para um condomínio
            </p>
            <ul className="max-h-[520px] space-y-1 overflow-auto pr-1">
              {condoOptions.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(c.id);
                    }}
                    onDragLeave={() => setDragOver((d) => (d === c.id ? null : d))}
                    onDrop={onDropCondo(c.id)}
                    onClick={() => sel.length && move(sel, c.id, c.name)}
                    className={`w-full border px-3 py-2 text-left text-xs ${
                      dragOver === c.id ? "border-ink bg-ink/10" : "border-ink/15 hover:bg-ink/5"
                    }`}
                  >
                    {c.name}
                    <span className="block text-[10px] text-muted-foreground">{c.propertiesCount} imóveis</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {pages > 1 && (
        <div className="flex items-center gap-3">
          <button type="button" className={btn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span className="text-xs text-muted-foreground">
            Página {page} de {pages}
          </span>
          <button type="button" className={btn} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}

function PropertyRow({
  p,
  condos,
  selected,
  onToggle,
  onAssign,
  disabled,
  newName,
  setNewName,
  onCreate,
  creating,
}: {
  p: CondoPropertyRow;
  condos: CondoGroup[];
  selected: boolean;
  onToggle: () => void;
  onAssign: (condominiumId: string, label: string) => void;
  disabled: boolean;
  newName: string;
  setNewName: (v: string) => void;
  onCreate: () => void;
  creating: boolean;
}) {
  const [showNew, setShowNew] = useState(false);
  return (
    <li
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
      className="flex flex-wrap items-center gap-3 p-3"
    >
      <input type="checkbox" checked={selected} onChange={onToggle} className="h-4 w-4" aria-label={`Selecionar ${p.title}`} />
      {p.image ? (
        <img src={p.image} alt="" className="h-12 w-16 shrink-0 rounded object-cover" loading="lazy" />
      ) : (
        <div className="h-12 w-16 shrink-0 rounded bg-ink/10" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{p.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[p.internal_code, p.address, p.neighborhood, p.city].filter(Boolean).join(" · ")}
        </p>
      </div>

      {p.suggestion?.id && (
        <button
          type="button"
          className={`${btn} border-emerald-600/40 text-emerald-800`}
          disabled={disabled}
          onClick={() => onAssign(p.suggestion!.id as string, p.suggestion!.label)}
        >
          Vincular a {p.suggestion.label}
        </button>
      )}

      <select
        value=""
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          if (v) onAssign(v, condos.find((c) => c.id === v)?.name ?? "");
        }}
        className={`${input} max-w-[220px]`}
        aria-label={`Condomínio de ${p.title}`}
      >
        <option value="">Condomínio…</option>
        {condos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {showNew ? (
        <span className="flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do condomínio"
            className={`${input} max-w-[200px]`}
          />
          <button type="button" className={btn} disabled={newName.trim().length < 2 || creating} onClick={onCreate}>
            Criar e vincular
          </button>
        </span>
      ) : (
        <button type="button" className={btn} onClick={() => setShowNew(true)}>
          + Novo
        </button>
      )}

      <Link to="/imoveis/$slug" params={{ slug: p.slug }} className={btn} target="_blank">
        Ver
      </Link>
    </li>
  );
}
