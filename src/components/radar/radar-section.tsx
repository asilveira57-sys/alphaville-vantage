import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Radar } from "lucide-react";
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
      className="bg-white px-6 py-20 md:py-24 border-y border-[#0D0D0D]/10"
    >
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#1A1A1A]/55 mb-4 inline-flex items-center gap-2">
          <Radar className="h-3.5 w-3.5" aria-hidden="true" /> Radar S.A. Imóveis
        </p>
        <h2
          id="radar-title"
          className="font-display text-3xl md:text-5xl font-medium leading-[1.08] text-[#0D0D0D] text-balance uppercase"
        >
          Encontre o imóvel certo para o seu momento
        </h2>
        <p className="mt-6 mx-auto max-w-[58ch] text-[#1A1A1A]/70 leading-relaxed">
          Responda algumas perguntas e ative um Radar personalizado com imóveis, regiões e
          oportunidades compatíveis com seu objetivo.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-10 inline-flex items-center justify-center bg-[#0D0D0D] text-white px-10 py-4 text-[11px] font-bold uppercase tracking-[0.22em] hover:bg-[#0D0D0D]/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2DA00] focus-visible:ring-offset-2"
        >
          Ativar meu radar
        </button>
      </div>

      {open ? (
        <Suspense fallback={null}>
          <RadarModal open={open} onClose={() => setOpen(false)} />
        </Suspense>
      ) : null}
    </section>
  );
}
