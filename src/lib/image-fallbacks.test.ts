import { describe, expect, it } from "vitest";
import { absoluteImageUrl, firstRealImage, getFallbackImage, largeVariant, resolveImage } from "./image-fallbacks";

describe("no generic photo fallback", () => {
  it("missing image resolves to null (neutral background), never a bundled photo", () => {
    expect(resolveImage(null, { type: "condo", region: "alphaville", seed: "alpha-green" })).toBeNull();
    expect(resolveImage("   ", { type: "property" })).toBeNull();
    expect(getFallbackImage({ type: "region", region: "alphaville" })).toBeNull();
  });

  it("logos and placeholders are not real photos", () => {
    expect(resolveImage("https://x.com/logo.png")).toBeNull();
    expect(resolveImage("https://x.com/topo_contato.jpg")).toBeNull();
  });

  it("condo photo order: guide photo → condominium photo → property photo", () => {
    expect(firstRealImage("https://a/guia.jpg", "https://a/condo.jpg", "/p.webp")).toBe("https://a/guia.jpg");
    expect(firstRealImage(null, "https://a/condo.jpg", "/p.webp")).toBe("https://a/condo.jpg");
    expect(firstRealImage(null, "", "/p.webp")).toBe("/p.webp");
    expect(firstRealImage(null, null, null)).toBeNull();
  });

  it("og:image becomes absolute and heroes use the 1200 px variant", () => {
    expect(absoluteImageUrl("/api/public/property-thumb/x-600.webp", "https://site.com")).toBe(
      "https://site.com/api/public/property-thumb/x-600.webp",
    );
    expect(largeVariant("/api/public/property-thumb/x-600.webp")).toBe("/api/public/property-thumb/x-1200.webp");
    expect(largeVariant("https://wsrv.nl/?url=a.jpg&w=600&output=webp")).toBe("https://wsrv.nl/?url=a.jpg&w=1200&output=webp");
  });
});
