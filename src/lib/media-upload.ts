import { supabase } from "@/integrations/supabase/client";
import { registerMedia, type MediaItem } from "@/lib/media.functions";

export const MAX_UPLOAD_MB = 8;
const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

export function publicUrlFor(path: string) {
  return `/api/public/editorial-image/${path}`;
}

function extFor(mime: string, fallback: string) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };
  return map[mime] ?? fallback;
}

async function readDimensions(file: Blob): Promise<{ width: number; height: number } | null> {
  if (typeof window === "undefined" || typeof createImageBitmap !== "function") return null;
  try {
    const bmp = await createImageBitmap(file);
    const dims = { width: bmp.width, height: bmp.height };
    bmp.close?.();
    return dims;
  } catch {
    return null;
  }
}

/**
 * Converte para WebP (mantendo GIF/AVIF/SVG intactos) e redimensiona
 * para no máximo 2000px no maior lado — o original pesado nunca é servido.
 */
async function optimize(file: File): Promise<{ blob: Blob; mime: string }> {
  if (!/^image\/(jpeg|png)$/.test(file.type) || typeof document === "undefined") {
    return { blob: file, mime: file.type };
  }
  try {
    const bmp = await createImageBitmap(file);
    const max = 2000;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob: file, mime: file.type };
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/webp", 0.86));
    if (!blob || blob.size >= file.size) return { blob: file, mime: file.type };
    return { blob, mime: "image/webp" };
  } catch {
    return { blob: file, mime: file.type };
  }
}

export function validateImageFile(file: File) {
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error(`Formato não permitido (${file.type || "desconhecido"}). Use JPG, PNG, WebP, GIF ou AVIF.`);
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new Error(`Arquivo muito grande (${(file.size / 1048576).toFixed(1)} MB). O limite é ${MAX_UPLOAD_MB} MB.`);
  }
}

/**
 * Envia o arquivo ao Storage e registra na biblioteca central de mídia.
 * Nunca grava base64 no banco.
 */
export async function uploadToLibrary(
  file: File,
  opts: { folder?: string; alt?: string; title?: string } = {},
): Promise<MediaItem> {
  validateImageFile(file);
  const folder = opts.folder ?? "geral";
  const { blob, mime } = await optimize(file);
  const dims = await readDimensions(blob);
  const ext = extFor(mime, file.name.split(".").pop()?.toLowerCase() || "jpg");
  const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${folder}/${id}.${ext}`;

  const { error } = await supabase.storage.from("editorial-images").upload(path, blob, {
    contentType: mime || undefined,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  return registerMedia({
    data: {
      storage_path: path,
      url: publicUrlFor(path),
      original_filename: file.name,
      title: opts.title ?? null,
      alt_text: opts.alt ?? null,
      width: dims?.width ?? null,
      height: dims?.height ?? null,
      mime_type: mime || null,
      size_bytes: blob.size,
      folder,
      is_decorative: false,
    },
  });
}

/** Extrai as URLs de imagem presentes num HTML (para registrar uso). */
export function extractImageUrls(html: string): string[] {
  const out: string[] = [];
  const re = /<img[^>]+src=["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(m[1]);
  return [...new Set(out)];
}

/** Retorna imagens do HTML sem atributo alt preenchido. */
export function imagesMissingAlt(html: string): number {
  const imgs = html.match(/<img[^>]*>/g) ?? [];
  return imgs.filter((tag) => !/alt=["'][^"']+["']/.test(tag)).length;
}
