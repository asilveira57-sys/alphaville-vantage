// Vídeos do YouTube nas páginas do portal (guias, blog, ruas).
// Regra: um vídeo tem UMA página principal (player + VideoObject); as outras
// páginas só mostram um card com link para ela (ver VideoCard).

export type PageVideo = {
  url?: string | null;          // link do YouTube (watch, youtu.be, shorts ou embed)
  title?: string | null;        // título do vídeo (igual ao do YouTube)
  description?: string | null;  // resumo em texto, mostrado embaixo do player
  upload_date?: string | null;  // AAAA-MM-DD (data de publicação no YouTube)
  duration?: string | null;     // "1:52" ou "12:05" ou "1:02:30"
  chapters?: string | null;     // uma linha por capítulo: "0:11 Residencial 1"
  href?: string | null;         // só no modo card: página que tem o player
};

export type VideoChapter = { seconds: number; time: string; label: string };

export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const s = url.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export function parsePageVideo(v: unknown): (PageVideo & { id: string }) | null {
  if (!v || typeof v !== "object") return null;
  const pv = v as PageVideo;
  const id = youtubeId(pv.url);
  return id ? { ...pv, id } : null;
}

function timeToSeconds(t: string): number | null {
  const parts = t.trim().split(":").map((p) => Number(p));
  if (parts.length < 2 || parts.length > 3 || parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

export function parseChapters(text: string | null | undefined): VideoChapter[] {
  if (!text) return [];
  const out: VideoChapter[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().match(/^((?:\d{1,2}:)?\d{1,2}:\d{2})\s*[-–—]?\s*(.+)$/);
    if (!m) continue;
    const seconds = timeToSeconds(m[1]);
    if (seconds === null) continue;
    out.push({ seconds, time: m[1], label: m[2].trim() });
  }
  return out;
}

/** "1:52" → "PT1M52S" (formato ISO 8601 que o Google pede). */
export function isoDuration(d: string | null | undefined): string | undefined {
  if (!d) return undefined;
  const total = timeToSeconds(d);
  if (!total) return undefined;
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s ? `${s}S` : ""}`;
}

export function youtubeThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeWatchUrl(id: string, seconds?: number) {
  return `https://www.youtube.com/watch?v=${id}${seconds ? `&t=${seconds}s` : ""}`;
}

/** Script JSON-LD VideoObject para o head da página principal do vídeo. */
export function videoObjectScript(raw: unknown, fallback: { title: string; description?: string | null; pageUrl: string }) {
  const v = parsePageVideo(raw);
  if (!v || v.href) return [];
  const chapters = parseChapters(v.chapters);
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: v.title || fallback.title,
    description: v.description || fallback.description || v.title || fallback.title,
    thumbnailUrl: [youtubeThumb(v.id), `https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`],
    embedUrl: `https://www.youtube.com/embed/${v.id}`,
    url: fallback.pageUrl,
  };
  if (v.upload_date) ld.uploadDate = /T/.test(v.upload_date) ? v.upload_date : `${v.upload_date}T08:00:00-03:00`;
  const dur = isoDuration(v.duration);
  if (dur) ld.duration = dur;
  if (chapters.length > 1) {
    ld.hasPart = chapters.map((c, i) => ({
      "@type": "Clip",
      name: c.label,
      startOffset: c.seconds,
      ...(chapters[i + 1] ? { endOffset: chapters[i + 1].seconds } : {}),
      url: youtubeWatchUrl(v.id, c.seconds),
    }));
  }
  return [{ type: "application/ld+json", children: JSON.stringify(ld) }];
}
