import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  images: string[];
  title: string;
};

export function PropertyGallery({ images, title }: Props) {
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
      {/* Main */}
      <div className="relative bg-brand-dark group">
        <div ref={mainRef} className="overflow-hidden">
          <div className="flex">
            {images.map((src, i) => (
              <div key={i} className="relative min-w-0 shrink-0 grow-0 basis-full">
                <img
                  src={src}
                  alt={`${title} — imagem ${i + 1}`}
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
                  src={src}
                  alt=""
                  loading="lazy"
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
