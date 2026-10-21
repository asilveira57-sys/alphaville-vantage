import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { zipSync, strToU8 } from "fflate";

// Ferramentas de fotos do imóvel — somente admin.
// 1) Baixar fotos (ZIP): montado em memória no servidor, nada é armazenado.
// 2) Salvar no acervo: copia as originais para o bucket privado "acervo"
//    (pasta por código do imóvel) e marca properties.in_acervo = true.
//    A rotina diária de conciliação nunca apaga arquivos desse bucket.

const MAX_PHOTOS = 60;
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB por foto

type Ctx = { supabase: any; userId: string };

async function requireAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Acesso restrito a administradores");
}

const isUsableImg = (u: string) =>
  /^https?:\/\//.test(u) &&
  !/(logo|favicon|whats|placeholder|topo_contato|supremo_|topo_)/i.test(u);

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

function extOf(url: string, contentType: string | null) {
  const fromUrl = url.split("?")[0].match(/\.(jpe?g|png|webp|avif|gif)$/i)?.[1]?.toLowerCase();
  if (fromUrl) return fromUrl === "jpeg" ? "jpg" : fromUrl;
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("avif")) return "avif";
  return "jpg";
}

async function loadProperty(supabase: any, propertyId: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("id,internal_code,source_id,slug,title,images,condominium_id,condominium_name,neighborhood,in_acervo")
    .eq("id", propertyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Imóvel não encontrado");

  // Nome oficial do condomínio via vínculo; nunca o rótulo cru do scrap.
  let condoName: string | null = null;
  if (data.condominium_id) {
    const { data: c } = await supabase
      .from("condominiums")
      .select("name")
      .eq("id", data.condominium_id)
      .maybeSingle();
    condoName = c?.name ?? null;
  }
  const code = data.internal_code || data.source_id || data.slug;
  const images = Array.isArray(data.images)
    ? (data.images as string[]).filter(isUsableImg).slice(0, MAX_PHOTOS)
    : [];
  return { ...data, code, condoName, images };
}

async function fetchPhoto(url: string): Promise<{ bytes: Uint8Array; contentType: string | null } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES || buf.byteLength === 0) return null;
    return { bytes: new Uint8Array(buf), contentType: res.headers.get("content-type") };
  } catch {
    return null;
  }
}

const idInput = (d: { propertyId: string }) =>
  z.object({ propertyId: z.string().uuid() }).parse(d);

export const downloadPropertyPhotosZip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    await requireAdmin(context as unknown as Ctx);
    const p = await loadProperty(context.supabase, data.propertyId);
    if (!p.images.length) throw new Error("Este imóvel não tem fotos");

    const files: Record<string, Uint8Array> = {};
    let fetched = 0;
    // Baixa em lotes de 5 para não sobrecarregar a origem.
    for (let i = 0; i < p.images.length; i += 5) {
      const batch = p.images.slice(i, i + 5);
      const results = await Promise.all(batch.map(fetchPhoto));
      results.forEach((r, j) => {
        if (!r) return;
        const n = String(i + j + 1).padStart(3, "0");
        files[`${n}.${extOf(batch[j], r.contentType)}`] = r.bytes;
        fetched++;
      });
    }
    if (!fetched) throw new Error("Não foi possível baixar nenhuma foto da origem");

    const zipped = zipSync(files, { level: 0 }); // fotos já são comprimidas
    const condo = p.condoName ? `-${slugify(p.condoName)}` : "";
    const filename = `${slugify(String(p.code))}${condo}.zip`;

    // Base64 em chunks (sem Node Buffer no worker).
    let bin = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < zipped.length; i += CHUNK) {
      bin += String.fromCharCode(...zipped.subarray(i, i + CHUNK));
    }
    return { filename, base64: btoa(bin), count: fetched, total: p.images.length };
  });

export const savePropertyToAcervo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(idInput)
  .handler(async ({ data, context }) => {
    await requireAdmin(context as unknown as Ctx);
    const p = await loadProperty(context.supabase, data.propertyId);
    if (!p.images.length) throw new Error("Este imóvel não tem fotos");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const folder = slugify(String(p.code));
    const paths: string[] = [];
    let saved = 0;

    for (let i = 0; i < p.images.length; i += 5) {
      const batch = p.images.slice(i, i + 5);
      const results = await Promise.all(batch.map(fetchPhoto));
      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        if (!r) continue;
        const n = String(i + j + 1).padStart(3, "0");
        const path = `${folder}/${n}.${extOf(batch[j], r.contentType)}`;
        const { error } = await supabaseAdmin.storage.from("acervo").upload(path, r.bytes, {
          contentType: r.contentType ?? "image/jpeg",
          upsert: true,
        });
        if (!error) {
          paths.push(path);
          saved++;
        }
      }
    }
    if (!saved) throw new Error("Não foi possível copiar nenhuma foto da origem");

    await supabaseAdmin.from("properties").update({ in_acervo: true }).eq("id", p.id);

    // Links assinados de 7 dias (bucket privado). O caminho no acervo é
    // permanente; o link expira, mas pode ser gerado de novo aqui.
    const { data: signed } = await supabaseAdmin.storage
      .from("acervo")
      .createSignedUrls(paths, 60 * 60 * 24 * 7);
    const links = (signed ?? [])
      .map((s, i) => ({ path: paths[i], url: s?.signedUrl ?? null }))
      .filter((l) => l.url);

    return { folder, saved, total: p.images.length, links };
  });
