// Public site rule: never substitute a missing photo with a stock/bundled image.
// When there is no real photo, callers render <BrandPlaceholder> (neutral brand
// background with the item's name). The `fallback` hints are kept only so older
// call sites stay type-compatible; they no longer pick any image.

export type FallbackKind = "region" | "post" | "property" | "condo" | "generic";

export type FallbackHint = {
  type?: FallbackKind;
  region?: string | null;
  seed?: string | null;
};

const BAD_IMAGE = /(logo|favicon|whats|placeholder|topo_contato)/i;

/** True when the URL points to a real photo (not empty, not a logo/placeholder). */
export function isRealImage(src: string | null | undefined): src is string {
  return !!src && !/^\s*$/.test(src) && !BAD_IMAGE.test(src);
}

/** Never returns a bundled image anymore — there is no generic photo fallback. */
export function getFallbackImage(_opts?: FallbackHint): null {
  return null;
}

/** Returns the real photo URL or null (render the neutral brand background). */
export function resolveImage(src: string | null | undefined, _fallback?: FallbackHint): string | null {
  return isRealImage(src) ? src.trim() : null;
}

/** First real photo from an ordered list of candidates. */
export function firstRealImage(...candidates: Array<string | null | undefined>): string | null {
  for (const c of candidates) if (isRealImage(c)) return c.trim();
  return null;
}

/** Absolute URL for og:image (relative /api paths are prefixed with the site URL). */
export function absoluteImageUrl(src: string | null | undefined, siteUrl: string): string | null {
  if (!isRealImage(src)) return null;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return `${siteUrl.replace(/\/$/, "")}${src}`;
  return null;
}
