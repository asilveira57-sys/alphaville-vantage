import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listCondoProperties,
  searchPropertiesForPicker,
  type CondoPropertyDTO,
} from "@/lib/condo-properties.functions";

const brl = (n: number | null) =>
  n == null ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

function Thumb({ p }: { p: CondoPropertyDTO }) {
  return p.image ? (
    <img src={p.image} alt="" className="h-14 w-20 shrink-0 rounded object-cover" loading="lazy" />
  ) : (
    <div className="h-14 w-20 shrink-0 rounded bg-ink/10" />
  );
}

function Info({ p }: { p: CondoPropertyDTO }) {
  const price = brl(p.price_sale) ?? brl(p.price_rent) ?? "Sob consulta";
  const purpose = p.purpose === "rent" ? "Locação" : p.purpose === "sale" ? "Venda" : p.purpose === "both" ? "Venda/Locação" : "—";
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm text-ink">{p.title}</p>
      <p className="truncate text-xs text-muted-foreground">
        {[p.internal_code, purpose, price, p.condominium_name].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}

export function CondoPropertiesPicker({
  condominiumId,
  includedIds,
  excludedIds,
  onChangeIncluded,
  onChangeExcluded,
}: {
  condominiumId: string | null;
  includedIds: string[];
  excludedIds: string[];
  onChangeIncluded: (ids: string[]) => void;
  onChangeExcluded: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const searchFn = useServerFn(searchPropertiesForPicker);
  const listFn = useServerFn(listCondoProperties);

  const previewQ = useQuery({
    queryKey: ["cms", "condo-properties", condominiumId, includedIds, excludedIds],
    queryFn: () => listFn({ data: { condominiumId, includedIds, excludedIds } }),
  });

  const autoQ = useQuery({
    queryKey: ["cms", "condo-properties-auto", condominiumId],
    queryFn: () => listFn({ data: { condominiumId, includedIds: [], excludedIds: [] } }),
    enabled: !!condominiumId,
  });

  const searchQ = useQuery({
    queryKey: ["cms", "property-search", q],
    queryFn: () => searchFn({ data: { q } }),
    enabled: q.trim().length >= 2,
  });

  const autoItems = autoQ.data?.items ?? [];
  const includedSet = useMemo(() => new Set(includedIds), [includedIds]);
  const excludedSet = useMemo(() => new Set(excludedIds), [excludedIds]);

  const toggleExcluded = (id: string) =>
    onChangeExcluded(excludedSet.has(id) ? excludedIds.filter((x) => x !== id) : [...excludedIds, id]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h4 className="text-sm font-medium text-ink">
          Imóveis vinculados ao condomínio ({autoItems.length})
        </h4>
        <p className="text-xs text-muted-foreground">
          Vêm automaticamente do cadastro de imóveis. Desmarque os que não devem aparecer na página.
        </p>
        {!condominiumId ? (
          <p className="text-xs text-amber-700">
            Selecione o “Condomínio relacionado” abaixo para carregar os imóveis.
          </p>
        ) : autoQ.isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : autoItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum imóvel vinculado a este condomínio.</p>
        ) : (
          <ul className="divide-y divide-ink/8 border border-ink/10 rounded max-h-80 overflow-auto">
            {autoItems.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-3">
                <input
                  type="checkbox"
                  checked={!excludedSet.has(p.id)}
                  onChange={() => toggleExcluded(p.id)}
                  className="h-4 w-4"
                  aria-label={`Exibir ${p.title}`}
                />
                <Thumb p={p} />
                <Info p={p} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-medium text-ink">Incluir imóveis manualmente</h4>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por título, código ou condomínio…"
          className="w-full border border-ink/15 bg-white px-3 py-2 text-sm"
        />
        {searchQ.data && searchQ.data.length > 0 && (
          <ul className="divide-y divide-ink/8 border border-ink/10 rounded max-h-72 overflow-auto">
            {searchQ.data.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-3">
                <Thumb p={p} />
                <Info p={p} />
                <button
                  type="button"
                  disabled={includedSet.has(p.id)}
                  onClick={() => onChangeIncluded([...includedIds, p.id])}
                  className="shrink-0 border border-ink/20 px-3 py-1.5 text-[10px] uppercase tracking-widest disabled:opacity-40"
                >
                  {includedSet.has(p.id) ? "Incluído" : "Incluir"}
                </button>
              </li>
            ))}
          </ul>
        )}
        {includedIds.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Incluídos manualmente (aparecem primeiro):</p>
            <ul className="divide-y divide-ink/8 border border-ink/10 rounded">
              {includedIds.map((id, i) => {
                const p = previewQ.data?.items.find((x) => x.id === id);
                return (
                  <li key={id} className="flex items-center gap-3 p-3">
                    <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                    {p ? <Thumb p={p} /> : null}
                    {p ? <Info p={p} /> : <span className="flex-1 text-xs text-muted-foreground">{id}</span>}
                    <button
                      type="button"
                      onClick={() => onChangeIncluded(includedIds.filter((x) => x !== id))}
                      className="shrink-0 border border-ink/20 px-3 py-1.5 text-[10px] uppercase tracking-widest"
                    >
                      Remover
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-medium text-ink">
          Prévia da página ({previewQ.data?.items.length ?? 0} imóveis)
        </h4>
        <p className="text-xs text-muted-foreground">
          Esta é a lista final que aparecerá no bloco de imóveis do condomínio (exibimos até 9 por aba).
        </p>
      </section>
    </div>
  );
}
