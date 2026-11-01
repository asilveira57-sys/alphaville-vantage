import { SITE_URL } from "./site";
import { listingCode, listingPrices } from "./property-listing";

export type ShareChannel = "whatsapp" | "facebook" | "email" | "copia" | "nativo";
export type ShareProperty = {
  slug: string; title: string; internal_code?: string | null; purpose?: string | null;
  price_sale?: number | null; price_rent?: number | null; bedrooms?: number | null;
  area_useful?: number | null; area_built?: number | null; area_total?: number | null;
  condominium_name?: string | null; neighborhood?: string | null;
};
export function trackedShareUrl(path: string, channel: ShareChannel) {
  const url = new URL(path, SITE_URL);
  url.searchParams.set("utm_source", channel);
  url.searchParams.set("utm_medium", "compartilhar");
  url.hash = "";
  return url.toString();
}
export function shortShareTitle(title: string) {
  return title.split(/\s+[–—-]\s+/)[0].replace(/,\s*\d+\s*dorm\..*$/i, "").replace(/\s*\|\s*S\.A.*$/i, "").trim();
}
export function propertyShareFacts(p: ShareProperty, purpose = "") {
  const area = p.area_useful || p.area_built || p.area_total;
  return [p.bedrooms && p.bedrooms > 0 ? `${p.bedrooms} dorm.` : null,
    area && area > 0 ? `${Number(area).toLocaleString("pt-BR")} m²` : null,
    [p.condominium_name, p.neighborhood].filter(Boolean).join(", ") || null].filter(Boolean).join(" · ");
}
export function propertyShareMessage(p: ShareProperty, channel: ShareChannel = "whatsapp", purpose = "") {
  const code = listingCode(p.internal_code);
  const price = listingPrices(p.price_sale, p.price_rent, purpose || (p.purpose === "rent" ? "rent" : ""), p.purpose).primary;
  return [`${shortShareTitle(p.title)} – ${price}`, propertyShareFacts(p), code ? `Cód. ${code}` : null,
    trackedShareUrl(`/imoveis/${p.slug}`, channel)].filter(Boolean).join("\n\n");
}
export function selectionSharePath(search: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value == null || value === "" || value === 0 || (key === "page" && value === 1) || (key === "sort" && value === "price_asc")) continue;
    if (key.startsWith("utm_")) continue;
    params.set(key, String(value));
  }
  return `/imoveis${params.size ? `?${params}` : ""}`;
}
export function selectionShareMessage(total: number, search: Record<string, unknown>) {
  return `Separei ${total} imóveis para você: ${trackedShareUrl(selectionSharePath(search), "whatsapp")}`;
}
/** Real cover only; re-size from the original even when the source is already proxied. */
export function shareCoverImage(image?: string | null) {
  if (!image || !/^https:\/\//i.test(image)) return undefined;
  let source = image;
  if (new URL(image).hostname === "wsrv.nl") source = new URL(image).searchParams.get("url") || image;
  const url = new URL("https://wsrv.nl/");
  url.search = new URLSearchParams({ url: source.replace(/^https?:\/\//, ""), w: "1200", h: "630", fit: "cover", output: "jpg", q: "80" }).toString();
  return url.toString();
}