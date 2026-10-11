import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Radar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackRadar, readTracking } from "./radar-utils";

const RadarModal = lazy(() => import("./radar-modal").then((m) => ({ default: m.RadarModal })));

export function RadarSection() {
  const [open, setOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const viewedRef = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || viewedRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !viewedRef.current) {
          viewedRef.current = true;
          trackRadar("radar_viewed", readTracking());
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="radar-title"
      className="radar-feature relative overflow-hidden bg-primary text-primary-foreground px-6 py-16 md:py-20 border-y border-primary-foreground/10"
    >
      <div className="max-w-7xl mx-auto grid gap-10 md:grid-cols-[1fr_auto] md:items-center">
        <div className="relative z-10 max-w-3xl">
        <p className="text-xs uppercase font-semibold text-accent mb-6 inline-flex items-center gap-2">
          <Radar className="h-4 w-4" aria-hidden="true" /> Radar S.A. Imóveis
        </p>
        <h2
          id="radar-title"
          className="font-display text-4xl md:text-5xl font-medium leading-[1.12] text-balance"
        >
          <span className="text-accent">Ative o seu Radar.</span><br />
          Coloque nossos corretores para encontrar o imóvel certo para você.
        </h2>
        <p className="mt-6 max-w-[55ch] text-primary-foreground/75 text-base md:text-lg leading-relaxed">
          Seu momento, suas prioridades. Nossa equipe e inteligência artificial conectam
          você aos imóveis e oportunidades que fazem sentido para você.
        </p>
        <Button
          variant="signal"
          type="button"
          onClick={() => setOpen(true)}
          className="mt-9 h-14 w-full sm:w-auto px-7 rounded-sm text-sm font-bold motion-safe:transition-transform motion-safe:hover:-translate-y-1"
        >
          <Sparkles aria-hidden="true" /> Ativar meu Radar <ArrowUpRight aria-hidden="true" />
        </Button>
        </div>
        <div className="radar-display hidden md:grid" aria-hidden="true">
          <div className="radar-sweep" />
          <Radar className="relative h-14 w-14 text-accent" strokeWidth={1} />
          <span className="radar-label text-accent text-xs font-semibold">S.A. / RADAR</span>
        </div>
      </div>

      {open ? (
        <Suspense fallback={null}>
          <RadarModal open={open} onClose={() => setOpen(false)} />
        </Suspense>
      ) : null}
    </section>
  );
}
