import { zipSync } from "fflate";

export async function buildPropertyPhotoZip(
  code: string,
  images: string[],
  fetchPhoto: (url: string) => Promise<{ bytes: Uint8Array; extension: string } | null>,
) {
  const safeCode = code.replace(/[^a-zA-Z0-9_-]/g, "_");
  const files: Record<string, Uint8Array> = {};
  let count = 0;
  for (let i = 0; i < images.length; i += 5) {
    const results = await Promise.all(images.slice(i, i + 5).map(fetchPhoto));
    results.forEach((photo, j) => {
      if (!photo) return;
      files[`${safeCode}_${String(i + j + 1).padStart(2, "0")}.${photo.extension}`] = photo.bytes;
      count++;
    });
  }
  if (!count) throw new Error("Não foi possível baixar nenhuma foto da origem");
  return { bytes: zipSync(files, { level: 0 }), filename: `${safeCode}.zip`, count, total: images.length };
}