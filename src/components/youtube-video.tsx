import { useState } from "react";
import { parseChapters, parsePageVideo, youtubeThumb, youtubeWatchUrl } from "@/lib/youtube";

/**
 * Player do vídeo principal da página. Usa o iframe do YouTube com loading="lazy":
 * não pesa o carregamento e o Google enxerga o vídeo (VideoObject vai no head).
 */
export function YouTubeVideo({ video, fallbackTitle, className = "" }: { video: unknown; fallbackTitle: string; className?: string }) {
  const v = parsePageVideo(video);
  const [start, setStart] = useState<number | null>(null);
  if (!v || v.href) return null;
  const chapters = parseChapters(v.chapters);
  const title = v.title || fallbackTitle;
  const src = `https://www.youtube.com/embed/${v.id}?rel=0${start !== null ? `&start=${start}&autoplay=1` : ""}`;

  return (
    <section className={`px-6 py-12 ${className}`} aria-label="Vídeo">
      <div className="max-w-4xl mx-auto">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">Vídeo</p>
        <div className="relative w-full aspect-video bg-ink/5 border border-ink/10 overflow-hidden">
          <iframe
            key={start ?? "base"}
            src={src}
            title={title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
        <h2 className="mt-4 font-serif text-xl md:text-2xl text-ink">{title}</h2>
        {v.description && <p className="mt-2 text-ink/75 leading-relaxed whitespace-pre-line">{v.description}</p>}
        {chapters.length > 0 && (
          <div className="mt-6">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Capítulos</p>
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {chapters.map((c) => (
                <li key={c.seconds}>
                  <button type="button" onClick={() => setStart(c.seconds)} className="text-left text-ink/80 hover:text-ink hover:underline underline-offset-4">
                    <span className="tabular-nums text-muted-foreground mr-3">{c.time}</span>{c.label}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
        <a href={youtubeWatchUrl(v.id)} target="_blank" rel="noopener" className="mt-6 inline-block text-[11px] uppercase tracking-widest hover:underline">
          Assistir no YouTube →
        </a>
      </div>
    </section>
  );
}

/** Card para páginas que NÃO são a principal do vídeo: capa + link para a página que tem o player. */
export function VideoCard({ video, label = "Assista ao passeio" }: { video: unknown; label?: string }) {
  const v = parsePageVideo(video);
  if (!v || !v.href) return null;
  const inner = (
    <>
      <div className="relative aspect-video md:w-72 shrink-0 overflow-hidden bg-ink/5">
        <img src={youtubeThumb(v.id)} alt={v.title ?? label} width={480} height={360} loading="lazy" decoding="async" className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
        <span aria-hidden className="absolute inset-0 flex items-center justify-center">
          <span className="h-12 w-12 rounded-full bg-ink/80 text-canvas flex items-center justify-center text-lg pl-1">▶</span>
        </span>
      </div>
      <div className="p-5 md:p-6">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Vídeo</p>
        <p className="font-serif text-xl text-ink leading-tight group-hover:underline">{v.title ?? label}</p>
        <p className="mt-3 text-[11px] uppercase tracking-widest text-ink/70">{label} →</p>
      </div>
    </>
  );
  const cls = "group flex flex-col md:flex-row border border-ink/15 hover:border-ink/30 transition-colors max-w-4xl";
  return <a href={v.href!} className={cls}>{inner}</a>;
}
