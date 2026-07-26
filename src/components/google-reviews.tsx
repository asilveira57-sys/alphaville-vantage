import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import {
  GOOGLE_RATING,
  GOOGLE_REVIEWS,
  GOOGLE_TOTAL_REVIEWS,
  MAPS_URL,
  WRITE_REVIEW_URL,
  type GoogleReview,
} from "@/lib/google-reviews-data";

function Stars({ value, label }: { value: number; label?: string }) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={label ?? `${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={i <= rounded ? "h-4 w-4 fill-[#CBA135] text-[#CBA135]" : "h-4 w-4 text-[#0D0D0D]/20"}
          strokeWidth={1.6}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: GoogleReview }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.text.length > 260;
  return (
    <article className="flex h-full flex-col bg-white p-8 ring-1 ring-black/5 shadow-[0_10px_40px_-24px_rgba(13,13,13,0.35)]">
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="grid h-11 w-11 place-items-center rounded-full bg-[#0D0D0D] text-sm font-semibold text-white"
        >
          {review.authorName.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#0D0D0D]">{review.authorName}</p>
          <div className="mt-1 flex items-center gap-2">
            <Stars value={review.rating} label={`${review.rating} de 5 estrelas`} />
            {review.date ? <span className="text-[11px] text-[#1A1A1A]/55">{review.date}</span> : null}
          </div>
        </div>
      </div>

      <p
        className={`mt-6 flex-1 whitespace-pre-line text-[15px] leading-relaxed text-[#1A1A1A]/85 ${
          expanded ? "" : "line-clamp-6"
        }`}
      >
        {review.text}
      </p>
      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 self-start text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1A1A1A] underline underline-offset-4 hover:text-[#0D0D0D]"
        >
          {expanded ? "Mostrar menos" : "Ler avaliação completa"}
        </button>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-[#0D0D0D]/10 pt-5">
        <span className="text-[10px] uppercase tracking-[0.22em] text-[#1A1A1A]/55">
          Publicado no Google
        </span>
        <a
          href={MAPS_URL}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1A1A1A] underline underline-offset-4 hover:text-[#0D0D0D]"
        >
          Abrir no Google
        </a>
      </div>
    </article>
  );
}

export function GoogleReviewsSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const reviews = GOOGLE_REVIEWS.slice(0, 6);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth / 1.05), behavior: "smooth" });
  };

  return (
    <section className="bg-[#EAEAE6] px-6 py-24" aria-labelledby="avaliacoes-google">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-8">
          <div className="max-w-[52ch]">
            <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-[#1A1A1A]/60">
              Avaliações reais no Google
            </p>
            <h2
              id="avaliacoes-google"
              className="font-display text-3xl font-medium text-[#0D0D0D] md:text-4xl"
            >
              A confiança de quem vive Alphaville
            </h2>
            <p className="mt-4 leading-relaxed text-[#1A1A1A]/70">
              Experiências reais de quem contou com a S.A. Imóveis para comprar, vender ou alugar.
            </p>
          </div>

          <div className="max-w-sm">
            <div className="flex items-center gap-4 bg-white px-6 py-5 ring-1 ring-black/5 shadow-[0_10px_40px_-28px_rgba(13,13,13,0.4)]">
              <span className="font-display text-4xl text-[#0D0D0D]">
                {GOOGLE_RATING.toFixed(1).replace(".", ",")}
              </span>
              <div>
                <Stars value={GOOGLE_RATING} label={`Nota média ${GOOGLE_RATING} de 5 no Google`} />
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#1A1A1A]/60">
                  {GOOGLE_TOTAL_REVIEWS} avaliações no Google
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-[#1A1A1A]/55">
              Avaliações publicadas originalmente no Google. Informações atualizadas periodicamente.
            </p>
          </div>
        </div>

        {reviews.length > 0 ? (
          <div className="relative">
            <div
              ref={trackRef}
              className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 md:gap-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="w-full shrink-0 snap-start md:w-[calc((100%-2rem)/2)] lg:w-[calc((100%-4rem)/3)]"
                >
                  <ReviewCard review={r} />
                </div>
              ))}
            </div>
            {reviews.length > 1 ? (
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Ver avaliações anteriores"
                  onClick={() => scrollBy(-1)}
                  className="grid h-12 w-12 place-items-center rounded-full bg-white ring-1 ring-black/10 transition hover:bg-[#0D0D0D] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D0D0D]"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Ver próximas avaliações"
                  onClick={() => scrollBy(1)}
                  className="grid h-12 w-12 place-items-center rounded-full bg-white ring-1 ring-black/10 transition hover:bg-[#0D0D0D] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0D0D0D]"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-[#1A1A1A]/70">
            Veja o perfil completo da S.A. Imóveis no Google para ler todas as avaliações.
          </p>
        )}

        <div className="mt-12 flex flex-wrap gap-4">
          <a
            href={WRITE_REVIEW_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center bg-[#F2DA00] px-7 py-4 text-xs font-bold uppercase tracking-widest text-[#0D0D0D] transition hover:brightness-105"
          >
            Avaliar a S.A. Imóveis no Google
          </a>
          <a
            href={MAPS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center border border-[#0D0D0D]/25 px-7 py-4 text-xs font-bold uppercase tracking-widest text-[#0D0D0D] transition hover:bg-[#0D0D0D] hover:text-white"
          >
            Ver todas as avaliações no Google
          </a>
        </div>
      </div>
    </section>
  );
}
