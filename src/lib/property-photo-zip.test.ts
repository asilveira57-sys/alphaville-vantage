import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import { buildPropertyPhotoZip } from "./property-photo-zip";

describe("ZIP de fotos", () => {
  it("usa o código no ZIP e numera as fotos na ordem da galeria", async () => {
    const r = await buildPropertyPhotoZip("AP07146", ["a", "b"], async (url) => ({ bytes: new Uint8Array([url === "a" ? 1 : 2]), extension: "jpg" }));
    expect(r.filename).toBe("AP07146.zip");
    const files = unzipSync(r.bytes);
    expect(Object.keys(files)).toEqual(["AP07146_01.jpg", "AP07146_02.jpg"]);
    expect([...files["AP07146_02.jpg"]]).toEqual([2]);
  });
  it("baixa em lotes de no máximo 5", async () => {
    let concurrent = 0;
    let peak = 0;
    await buildPropertyPhotoZip("AP07146", Array.from({ length: 12 }, (_, i) => String(i)), async () => {
      concurrent++;
      peak = Math.max(peak, concurrent);
      await new Promise((resolve) => setTimeout(resolve, 2));
      concurrent--;
      return { bytes: new Uint8Array([1]), extension: "jpg" };
    });
    expect(peak).toBe(5);
  });
  it("conta falhas sem alterar a posição das fotos restantes", async () => {
    const r = await buildPropertyPhotoZip("AP07146", ["a", "fail", "c"], async (url) => url === "fail" ? null : { bytes: new Uint8Array([1]), extension: "jpg" });
    expect(r.count).toBe(2);
    expect(r.total).toBe(3);
    expect(Object.keys(unzipSync(r.bytes))).toEqual(["AP07146_01.jpg", "AP07146_03.jpg"]);
  });
});