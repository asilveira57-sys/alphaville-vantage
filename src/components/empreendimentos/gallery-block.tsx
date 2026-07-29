import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type EmpreendimentoMediaItem = {
  id: string;
  url: string;
  title: string | null;
  caption: string | null;
  alt_text: string | null;
  credit: string | null;
  source: string | null;
  is_cover: boolean;
  sort_order: number;
};

export function useEmpreendimentoMedia(empreendimentoSlug: string) {
  const [items, setItems] = useState<EmpreendimentoMediaItem[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("empreendimento_media")
        .select("id,url,title,caption,alt_text,credit,source,is_cover,sort_order")
        .eq("empreendimento_slug", empreendimentoSlug)
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (!active) return;
      const list = (data ?? []) as EmpreendimentoMediaItem[];
      // capa sempre primeiro, preservando a ordem definida no Admin para o restante
      list.sort((a, b) => Number(b.is_cover) - Number(a.is_cover));
      setItems(list);
    })();
    return () => {
      active = false;
    };
  }, [empreendimentoSlug]);

  return items;
}

export function EmpreendimentoGalleryBlock({
  empreendimentoSlug,
  name,
}: {
  empreendimentoSlug: string;
  name: string;
}) {
  const items = useEmpreendimentoMedia(empreendimentoSlug);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);

  const total = items?.length ?? 0;
  const prev = useCallback(() => setIndex((i) => (total ? (i - 1 + total) % total : 0)), [total]);
  const next = useCallback(() => setIndex((i) => (total ? (i + 1) % total : 0)), [total]);

  useEffect(() => {
    if (!total) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") setZoom(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [total, prev, next]);

  if (!items || items.length === 0) return null;

  const current = items[Math.min(index, items.length - 1)];
  const alt = current.alt_text || current.title || `${name} — imagem ${index + 1}`;

  return (
    <section className="bg-[#0D0D0D] px-6 py-16" aria-label={`Galeria de fotos — ${name}`}>
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display mb-6 text-2xl text-white">Galeria de fotos</h2>

        <div className="relative">
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="block w-full"
            aria-label="Ampliar imagem"
          >
            <img
              src={current.url}
              alt={alt}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              sizes="(max-width: 768px) 92vw, 1100px"
              className="aspect-[16/10] w-full bg-black object-cover"
            />
          </button>

          {items.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Imagem anterior"
                onClick={prev}
                className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center bg-[#F2DA00] text-[#0D0D0D] shadow-lg hover:brightness-95"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Próxima imagem"
                onClick={next}
                className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center bg-[#F2DA00] text-[#0D0D0D] shadow-lg hover:brightness-95"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="absolute bottom-3 right-3 bg-black/75 px-3 py-1.5 text-xs font-medium tracking-wider text-white">
            {index + 1}/{items.length}
          </div>
        </div>

        {(current.caption || current.credit || current.source) && (
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            {current.caption}
            {(current.credit || current.source) && (
              <span className="ml-2 text-xs text-white/45">
                {current.credit ? `Crédito: ${current.credit}` : ""}
                {current.credit && current.source ? " · " : ""}
                {current.source ? `Fonte: ${current.source}` : ""}
              </span>
            )}
          </p>
        )}

        {items.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {items.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ir para imagem ${i + 1}`}
                className={`h-16 w-24 shrink-0 border-2 transition ${
                  i === index ? "border-[#F2DA00]" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img src={m.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoom(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Fechar"
            className="absolute right-5 top-5 text-white/80 hover:text-white"
            onClick={() => setZoom(false)}
          >
            <X className="h-7 w-7" />
          </button>
          <img
            src={current.url}
            alt={alt}
            className="max-h-[88vh] max-w-[94vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
