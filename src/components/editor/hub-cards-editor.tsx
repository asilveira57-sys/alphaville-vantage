import { useState } from "react";
import { LinkDialog } from "@/components/editor/link-dialog";
import { MediaPicker } from "@/components/media/media-picker";

export type HubCardDraft = {
  eyebrow: string;
  title: string;
  lead: string;
  to: string;
  image: string;
};

const inputCls =
  "w-full h-10 border border-ink/15 bg-transparent px-3 text-sm focus:outline-none focus:border-ink/40";

/**
 * Editor dos cards de um hub (guias regionais).
 * Permite escolher a página de destino pela busca interna (em vez de digitar a URL na mão),
 * definir a imagem pela biblioteca de mídia e conferir/abrir o link final.
 */
export function HubCardsEditor({
  cards,
  onChange,
}: {
  cards: HubCardDraft[];
  onChange: (next: HubCardDraft[]) => void;
}) {
  const [linkIndex, setLinkIndex] = useState<number | null>(null);
  const [mediaIndex, setMediaIndex] = useState<number | null>(null);

  const patch = (i: number, p: Partial<HubCardDraft>) => {
    const next = [...cards];
    next[i] = { ...next[i], ...p };
    onChange(next);
  };

  return (
    <div className="border border-ink/15 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Cards do hub ({cards.length})
        </span>
        <button
          type="button"
          onClick={() => onChange([...cards, { eyebrow: "", title: "", lead: "", to: "", image: "" }])}
          className="text-[10px] uppercase tracking-widest border border-ink/20 px-3 py-1 hover:bg-ink/5"
        >
          + Card
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Cada card aponta para uma página do site. Use “Escolher página” para vincular sem digitar a URL —
        a busca lista páginas do CMS, imóveis, condomínios e seções fixas.
      </p>

      {cards.map((c, i) => (
        <div key={i} className="border border-ink/10 p-3 space-y-2 bg-ink/[0.02]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">#{i + 1}</span>
            <div className="flex gap-2 text-[10px] uppercase tracking-widest">
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = [...cards];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    onChange(next);
                  }}
                  className="hover:underline"
                >
                  ↑
                </button>
              )}
              {i < cards.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = [...cards];
                    [next[i + 1], next[i]] = [next[i], next[i + 1]];
                    onChange(next);
                  }}
                  className="hover:underline"
                >
                  ↓
                </button>
              )}
              <button
                type="button"
                onClick={() => onChange(cards.filter((_, j) => j !== i))}
                className="text-red-600 hover:underline"
              >
                excluir
              </button>
            </div>
          </div>

          <input
            placeholder="Eyebrow (ex.: Educação)"
            value={c.eyebrow}
            onChange={(e) => patch(i, { eyebrow: e.target.value })}
            className={inputCls}
          />
          <input
            placeholder="Título do card"
            value={c.title}
            onChange={(e) => patch(i, { title: e.target.value })}
            className={inputCls}
          />
          <textarea
            placeholder="Descrição curta"
            rows={2}
            value={c.lead}
            onChange={(e) => patch(i, { lead: e.target.value })}
            className="w-full border border-ink/15 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-ink/40"
          />

          {/* Destino */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Página de destino</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                placeholder="/artigos/slug"
                value={c.to}
                onChange={(e) => patch(i, { to: e.target.value })}
                className={`${inputCls} flex-1 min-w-[200px] font-mono`}
              />
              <button
                type="button"
                onClick={() => setLinkIndex(i)}
                className="text-[10px] uppercase tracking-widest border border-ink/20 px-3 py-2 hover:bg-ink/5"
              >
                Escolher página
              </button>
              {c.to && (
                <a
                  href={c.to}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] uppercase tracking-widest underline underline-offset-4 text-muted-foreground hover:text-ink"
                >
                  Abrir
                </a>
              )}
            </div>
            {!c.to && (
              <p className="text-[11px] text-amber-700">Sem destino: o card ficará sem link na página pública.</p>
            )}
          </div>

          {/* Imagem */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Imagem do card</span>
            <div className="flex items-center gap-3">
              {c.image ? (
                <img src={c.image} alt="" className="h-14 w-20 object-cover border border-ink/10" />
              ) : (
                <div className="h-14 w-20 border border-dashed border-ink/20 grid place-items-center text-[10px] text-muted-foreground">
                  auto
                </div>
              )}
              <button
                type="button"
                onClick={() => setMediaIndex(i)}
                className="text-[10px] uppercase tracking-widest border border-ink/20 px-3 py-2 hover:bg-ink/5"
              >
                Escolher da biblioteca
              </button>
              {c.image && (
                <button
                  type="button"
                  onClick={() => patch(i, { image: "" })}
                  className="text-[10px] uppercase tracking-widest text-red-600 hover:underline"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {cards.length === 0 && <p className="text-xs text-muted-foreground">Nenhum card. Clique em “+ Card”.</p>}

      <LinkDialog
        open={linkIndex !== null}
        initialUrl={linkIndex !== null ? cards[linkIndex]?.to : ""}
        onClose={() => setLinkIndex(null)}
        onSubmit={(url) => {
          if (linkIndex !== null) patch(linkIndex, { to: url });
          setLinkIndex(null);
        }}
      />

      <MediaPicker
        open={mediaIndex !== null}
        folder="guias"
        onClose={() => setMediaIndex(null)}
        onSelect={(item) => {
          if (mediaIndex !== null) patch(mediaIndex, { image: item.url });
          setMediaIndex(null);
        }}
      />
    </div>
  );
}
