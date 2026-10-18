// O cdn.uso.com.br não oferece tamanhos menores pela URL (ignora ?w=), então
// fotos externas passam pelo wsrv.nl (gratuito, com cache em CDN). Se o
// redimensionador falhar, onImgFallback troca para a foto original.
export function resized(url: string | null | undefined, w: number): string | undefined {
  if (!url) return undefined;
  if (!/^https?:\/\//.test(url) || /wsrv\.nl|property-thumb/.test(url)) return url;
  const bare = url.replace(/^https?:\/\//, "");
  return `https://wsrv.nl/?url=${encodeURIComponent(bare)}&w=${w}&output=webp&q=78&we`;
}

/** onError: volta para a original (guardada em data-orig) uma única vez. */
export function onImgFallback(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  const orig = img.dataset.orig;
  if (orig && img.src !== orig) {
    img.removeAttribute("srcset");
    img.src = orig;
  }
}
