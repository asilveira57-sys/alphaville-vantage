import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { MediaPicker } from "@/components/media/media-picker";
import { LinkDialog } from "@/components/editor/link-dialog";
import { checkIsAdmin } from "@/lib/admin.functions";
import { listCardImages, updateCardImage, updateCardLink, type CardImageItem } from "@/lib/card-images.functions";

export const Route = createFileRoute("/_authenticated/admin-cards")({
  head: () => ({
    meta: [
      { title: "Admin · Imagens dos cards — Portal S.A" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminCards,
});

const KIND_LABEL: Record<CardImageItem["kind"], string> = {
  featured: "Imagem de destaque",
  hub_card: "Card de hub",
  condo_cover: "Capa de condomínio",
  street_hero: "Imagem da rua",
  guide_cover: "Capa do guia de rua",
};

function keyOf(it: CardImageItem) {
  return `${it.kind}:${it.id}:${it.index ?? "-"}`;
}

function AdminCards() {
  const qc = useQueryClient();
  const checkFn = useServerFn(checkIsAdmin);
  const listFn = useServerFn(listCardImages);
  const updateFn = useServerFn(updateCardImage);
  const linkFn = useServerFn(updateCardLink);

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | CardImageItem["kind"]>("all");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [picking, setPicking] = useState<CardImageItem | null>(null);
  const [linking, setLinking] = useState<CardImageItem | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkFn() });
  const listQ = useQuery({
    queryKey: ["card-images"],
    queryFn: () => listFn(),
    enabled: !!adminQ.data?.isAdmin,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["card-images"] });
    qc.invalidateQueries({ queryKey: ["editorial"] });
    qc.invalidateQueries({ queryKey: ["hub"] });
    qc.invalidateQueries({ queryKey: ["ruas"] });
    qc.invalidateQueries({ queryKey: ["street-guides"] });
  };

  const mut = useMutation({
    mutationFn: (v: { kind: CardImageItem["kind"]; id: string; index?: number; image: string | null }) =>
      updateFn({ data: v }),
    onSuccess: invalidate,
    onError: (e: Error) => setErr(e.message),
  });

  const linkMut = useMutation({
    mutationFn: (v: { id: string; index: number; to: string }) => linkFn({ data: v }),
    onSuccess: invalidate,
    onError: (e: Error) => setErr(e.message),
  });

  const items = listQ.data?.items ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (kind !== "all" && it.kind !== kind) return false;
      if (onlyMissing && it.image) return false;
      if (!q) return true;
      return `${it.label} ${it.context} ${it.url ?? ""}`.toLowerCase().includes(q);
    });
  }, [items, search, kind, onlyMissing]);

  const missing = items.filter((i) => !i.image).length;

  if (adminQ.isLoading) {
    return <SiteLayout><div className="px-6 py-24 text-sm text-muted-foreground">Carregando…</div></SiteLayout>;
  }
  if (!adminQ.data?.isAdmin) {
    return <SiteLayout><div className="px-6 py-24 text-sm text-muted-foreground">Acesso restrito.</div></SiteLayout>;
  }

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Administração</p>
            <h1 className="font-serif text-4xl text-ink">Imagens dos cards</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Todas as imagens usadas nos cards do site: destaques de páginas, cards dos hubs e capas de condomínios.
              {" "}<strong>{items.length}</strong> itens · <strong>{missing}</strong> sem imagem.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin-midia" className="border border-ink text-ink px-4 py-2 text-xs uppercase tracking-widest hover:bg-ink hover:text-canvas">Biblioteca de mídia</Link>
            <Link to="/admin-mapa" className="border border-ink text-ink px-4 py-2 text-xs uppercase tracking-widest hover:bg-ink hover:text-canvas">Mapa do sistema</Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border border-ink/15 p-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por título, tipo ou destino…"
            className="flex-1 min-w-[220px] border border-ink/15 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-ink"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            className="border border-ink/15 bg-transparent px-2 py-2 text-sm"
          >
            <option value="all">Todos os tipos</option>
            <option value="featured">Imagem de destaque</option>
            <option value="hub_card">Cards de hub</option>
            <option value="condo_cover">Capas de condomínio</option>
            <option value="street_hero">Imagens das ruas</option>
            <option value="guide_cover">Capas dos guias de rua</option>
          </select>
          <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
            Só sem imagem
          </label>
        </div>

        {err && <p className="text-xs text-red-600">{err}</p>}

        {listQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando imagens…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum item encontrado com esses filtros.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filtered.map((it) => (
              <div key={keyOf(it)} className="border border-ink/15 flex flex-col">
                <div className="aspect-[4/3] bg-ink/[0.04] grid place-items-center overflow-hidden">
                  {it.image ? (
                    <img src={it.image} alt={it.label} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">sem imagem</span>
                  )}
                </div>
                <div className="p-3 space-y-2 flex-1 flex flex-col">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{KIND_LABEL[it.kind]}</span>
                  <p className="text-sm text-ink leading-snug line-clamp-2">{it.label}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{it.context}</p>

                  <div className="border-t border-ink/10 pt-2 space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Destino</span>
                    {it.url ? (
                      <p className="text-[11px] font-mono text-ink break-all line-clamp-2">{it.url}</p>
                    ) : (
                      <p className="text-[11px] text-amber-700">Sem link definido</p>
                    )}
                    {it.kind === "hub_card" ? (
                      <button
                        type="button"
                        onClick={() => { setErr(null); setLinking(it); }}
                        className="text-[10px] uppercase tracking-widest border border-ink/20 px-3 py-1 hover:bg-ink hover:text-canvas"
                      >
                        {it.url ? "Trocar destino" : "Escolher página"}
                      </button>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">
                        Destino automático (endereço da própria página).
                      </p>
                    )}
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => { setErr(null); setPicking(it); }}
                      className="text-[10px] uppercase tracking-widest border border-ink/20 px-3 py-2 hover:bg-ink hover:text-canvas"
                    >
                      {it.image ? "Trocar imagem" : "Definir imagem"}
                    </button>
                    {it.image && (
                      <button
                        type="button"
                        onClick={() => mut.mutate({ kind: it.kind, id: it.id, index: it.index, image: null })}
                        className="text-[10px] uppercase tracking-widest text-red-600 hover:underline px-1"
                      >
                        Remover
                      </button>
                    )}
                    {it.url && (
                      <a
                        href={it.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] uppercase tracking-widest underline underline-offset-4 text-muted-foreground hover:text-ink px-1 py-2"
                      >
                        Abrir
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MediaPicker
        open={picking !== null}
        folder="guias"
        onClose={() => setPicking(null)}
        onSelect={(m) => {
          if (picking) mut.mutate({ kind: picking.kind, id: picking.id, index: picking.index, image: m.url });
          setPicking(null);
        }}
      />

      <LinkDialog
        open={linking !== null}
        initialUrl={linking?.url ?? ""}
        onClose={() => setLinking(null)}
        onSubmit={(url) => {
          if (linking && linking.index !== undefined) {
            linkMut.mutate({ id: linking.id, index: linking.index, to: url });
          }
          setLinking(null);
        }}
      />

    </SiteLayout>
  );
}
