import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { resized, onImgFallback } from "@/lib/img-resize";

type Props = {
  images: string[];
  title: string;
  /** Versão WebP de ~1200 px da foto principal; o original só abre em tela cheia. */
  firstLarge?: string | null;
};

export function PropertyGallery({ images, title, firstLarge }: Props) {
  const [full, setFull] = React.useState<number | null>(null);
  const shown = (i: number) => (i === 0 && firstLarge ? firstLarge : resized(images[i], 1200) ?? images[i]);
  const thumb = (i: number) => resized(images[i], 240) ?? images[i];
  const [mainRef, mainApi] = useEmblaCarousel({ loop: true });
  const [thumbsRef, thumbsApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true,
  });
  const [selected, setSelected] = React.useState(0);

  const onSelect = React.useCallback(() => {
    if (!mainApi || !thumbsApi) return;
    const idx = mainApi.selectedScrollSnap();
    setSelected(idx);
    thumbsApi.scrollTo(idx);
  }, [mainApi, thumbsApi]);

  React.useEffect(() => {
    if (!mainApi) return;
    onSelect();
    mainApi.on("select", onSelect);
    mainApi.on("reInit", onSelect);
    return () => {
      mainApi.off("select", onSelect);
    };
  }, [mainApi, onSelect]);

  const scrollTo = (i: number) => mainApi?.scrollTo(i);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") mainApi?.scrollPrev();
      if (e.key === "ArrowRight") mainApi?.scrollNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mainApi]);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-[16/9] bg-ink/5 flex items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">
        Sem imagens disponíveis
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {full !== null && (
        <div className="fixed inset-0 z-[90] bg-brand-dark flex items-center justify-center" role="dialog" aria-label="Galeria em tela cheia" onClick={() => setFull(null)}>
          <img width={800} height={600} loading="lazy" src={images[full]} alt={`${title} — imagem ${full + 1}`} decoding="async" className="max-h-full max-w-full object-contain" />
          <button type="button" aria-label="Fechar" onClick={() => setFull(null)} className="absolute top-4 right-4 grid place-items-center h-11 w-11 bg-brand-yellow text-brand-dark">
            <X className="h-5 w-5" />
          </button>
          <button type="button" aria-label="Imagem anterior" onClick={(e) => { e.stopPropagation(); setFull((full - 1 + images.length) % images.length); }} className="absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center h-11 w-11 bg-brand-yellow text-brand-dark">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" aria-label="Próxima imagem" onClick={(e) => { e.stopPropagation(); setFull((full + 1) % images.length); }} className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center h-11 w-11 bg-brand-yellow text-brand-dark">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
      {/* Main */}
      <div className="relative bg-brand-dark group">
        <div ref={mainRef} className="overflow-hidden">
          <div className="flex">
            {images.map((src, i) => (
              <div key={i} className="relative min-w-0 shrink-0 grow-0 basis-full">
                <img
                  src={shown(i)}
                  data-orig={src}
                  onError={onImgFallback}
                  alt={`${title} — imagem ${i + 1}`}
                  width={1200}
                  height={750}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  sizes="(max-width: 1024px) 100vw, 960px"
                  {...(i === 0 ? { fetchPriority: "high" as const } : {})}
                  className="w-full aspect-[16/10] object-contain bg-brand-dark"
                />

              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          aria-label="Imagem anterior"
          onClick={() => mainApi?.scrollPrev()}
          className="absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center h-11 w-11 bg-brand-yellow text-brand-dark hover:brightness-95 shadow-lg"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Próxima imagem"
          onClick={() => mainApi?.scrollNext()}
          className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center h-11 w-11 bg-brand-yellow text-brand-dark hover:brightness-95 shadow-lg"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <button
          type="button"
          aria-label="Ver em tela cheia"
          onClick={() => setFull(selected)}
          className="absolute top-3 right-3 grid place-items-center h-10 w-10 bg-brand-dark/80 text-white hover:text-brand-yellow"
        >
          <Expand className="h-4 w-4" />
        </button>

        <div className="absolute bottom-3 right-3 bg-brand-dark/80 text-white text-xs px-3 py-1.5 tracking-wider font-medium">
          {selected + 1} / {images.length}
        </div>
      </div>

      {/* Thumbs */}
      {images.length > 1 && (
        <div ref={thumbsRef} className="overflow-hidden">
          <div className="flex gap-2">
            {images.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={`Ir para imagem ${i + 1}`}
                className={cn(
                  "relative shrink-0 basis-[18%] sm:basis-[12%] md:basis-[9%] aspect-[4/3] overflow-hidden border-2 transition",
                  selected === i ? "border-brand-yellow" : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <img
                  src={thumb(i)}
                  data-orig={src}
                  onError={onImgFallback}
                  alt=""
                  width={240}
                  height={180}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover bg-ink/10"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
