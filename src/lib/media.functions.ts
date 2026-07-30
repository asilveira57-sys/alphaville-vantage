import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const MEDIA_FOLDERS = [
  "geral",
  "blog",
  "ruas",
  "condominios",
  "guias",
  "empreendimentos",
  "parceiros",
  "institucional",
] as const;

export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export const MEDIA_FOLDER_LABELS: Record<string, string> = {
  geral: "Geral",
  blog: "Blog",
  ruas: "Ruas",
  condominios: "Condomínios",
  guias: "Guias",
  empreendimentos: "Empreendimentos",
  parceiros: "Parceiros",
  institucional: "Institucional",
};

export type MediaItem = {
  id: string;
  storage_path: string;
  url: string;
  original_filename: string;
  title: string | null;
  alt_text: string | null;
  caption: string | null;
  description: string | null;
  width: number | null;
  height: number | null;
  mime_type: string | null;
  size_bytes: number | null;
  folder: string;
  is_decorative: boolean;
  created_at: string;
  updated_at: string;
};

function publicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  );
}

async function assertEditor(ctx: { supabase: any; userId: string }) {
  const [{ data: isAdmin }, { data: isEditor }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "editor" }),
  ]);
  if (!isAdmin && !isEditor) throw new Error("Forbidden");
}

async function audit(
  ctx: { supabase: any; userId: string },
  action: string,
  entity_type: string,
  entity_id: string | null,
  details: Record<string, unknown> = {},
) {
  await ctx.supabase.from("cms_audit_log").insert({
    actor_id: ctx.userId,
    action,
    entity_type,
    entity_id,
    details,
  });
}

// ---------------- LIST ----------------

export const listMedia = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        search: z.string().optional(),
        folder: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(120).default(48),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb
      .from("media_library")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(`original_filename.ilike.${s},title.ilike.${s},alt_text.ilike.${s}`);
    }
    if (data.folder && data.folder !== "all") q = q.eq("folder", data.folder);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", `${data.to}T23:59:59`);

    const start = (data.page - 1) * data.pageSize;
    const { data: rows, error, count } = await q.range(start, start + data.pageSize - 1);
    if (error) throw new Error(error.message);
    return { items: (rows ?? []) as MediaItem[], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

export const getMediaUsage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ mediaId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from("media_usage")
      .select("id,content_type,content_id,content_label,usage_kind,created_at")
      .eq("media_id", data.mediaId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------------- WRITE ----------------

const registerSchema = z.object({
  storage_path: z.string().min(1),
  url: z.string().min(1),
  original_filename: z.string().min(1),
  title: z.string().optional().nullable(),
  alt_text: z.string().optional().nullable(),
  caption: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  mime_type: z.string().optional().nullable(),
  size_bytes: z.number().int().nonnegative().optional().nullable(),
  folder: z.string().default("geral"),
  is_decorative: z.boolean().default(false),
});

export const registerMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => registerSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertEditor(context);
    const { data: existing } = await context.supabase
      .from("media_library")
      .select("*")
      .eq("storage_path", data.storage_path)
      .maybeSingle();
    if (existing) return existing as MediaItem;

    const { data: row, error } = await context.supabase
      .from("media_library")
      .insert({ ...data, uploaded_by: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await audit(context, "media.upload", "media", row.id, { path: data.storage_path });
    return row as MediaItem;
  });

export const updateMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().optional().nullable(),
        alt_text: z.string().optional().nullable(),
        caption: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        folder: z.string().optional(),
        is_decorative: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertEditor(context);
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("media_library")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await audit(context, "media.update", "media", id, patch);
    return row as MediaItem;
  });

export const deleteMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertEditor(context);
    const { count } = await context.supabase
      .from("media_usage")
      .select("id", { count: "exact", head: true })
      .eq("media_id", data.id);
    if ((count ?? 0) > 0) {
      throw new Error("Esta imagem está em uso e não pode ser excluída. Remova os usos antes.");
    }
    const { data: row } = await context.supabase
      .from("media_library")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();

    const { error } = await context.supabase.from("media_library").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    if (row?.storage_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from("editorial-images").remove([row.storage_path]);
    }
    await audit(context, "media.delete", "media", data.id, { path: row?.storage_path ?? null });
    return { ok: true };
  });

export const setMediaUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        content_type: z.string().min(1),
        content_id: z.string().min(1),
        content_label: z.string().optional().nullable(),
        urls: z.array(z.string()),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertEditor(context);
    await context.supabase
      .from("media_usage")
      .delete()
      .eq("content_type", data.content_type)
      .eq("content_id", data.content_id);

    if (data.urls.length === 0) return { linked: 0 };

    const { data: media } = await context.supabase
      .from("media_library")
      .select("id,url")
      .in("url", data.urls);

    const rows = (media ?? []).map((m: { id: string }) => ({
      media_id: m.id,
      content_type: data.content_type,
      content_id: data.content_id,
      content_label: data.content_label ?? null,
      usage_kind: "inline",
    }));
    if (rows.length) await context.supabase.from("media_usage").upsert(rows, { onConflict: "media_id,content_type,content_id,usage_kind" });
    return { linked: rows.length };
  });

// ---------------- MIGRAÇÃO DE IMAGENS EMBUTIDAS ----------------

/**
 * Varre editorial_pages e streets procurando imagens base64 embutidas no HTML,
 * envia para o Storage, registra na biblioteca e substitui pela URL permanente.
 * Idempotente: HTML já migrado não contém mais base64.
 */
export const migrateEmbeddedImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ dryRun: z.boolean().default(true) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertEditor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const report: { table: string; id: string; label: string; images: number; migrated: number }[] = [];
    const B64 = /<img[^>]+src=["']data:(image\/[a-zA-Z+]+);base64,([^"']+)["'][^>]*>/g;

    const sources: { table: "editorial_pages" | "streets"; field: string; labelField: string }[] = [
      { table: "editorial_pages", field: "html_content", labelField: "title" },
      { table: "streets", field: "description", labelField: "name" },
    ];

    for (const src of sources) {
      const { data: rows } = await supabaseAdmin
        .from(src.table)
        .select(`id, ${src.labelField}, ${src.field}`);
      for (const row of (rows ?? []) as any[]) {
        const html: string = row[src.field] ?? "";
        if (!html || !html.includes("base64,")) continue;
        const matches = [...html.matchAll(B64)];
        if (!matches.length) continue;

        let migrated = 0;
        let nextHtml = html;
        if (!data.dryRun) {
          for (const m of matches) {
            const mime = m[1];
            const ext = mime.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
            const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
            const path = `migrated/${row.id}-${migrated}-${Date.now()}.${ext}`;
            const { error: upErr } = await supabaseAdmin.storage
              .from("editorial-images")
              .upload(path, bytes, { contentType: mime, upsert: false });
            if (upErr) continue;
            const url = `/api/public/editorial-image/${path}`;
            await supabaseAdmin.from("media_library").insert({
              storage_path: path,
              url,
              original_filename: `${row.id}-${migrated}.${ext}`,
              mime_type: mime,
              size_bytes: bytes.length,
              folder: src.table === "streets" ? "ruas" : "blog",
              uploaded_by: context.userId,
            });
            nextHtml = nextHtml.replace(m[0], m[0].replace(/src=["']data:[^"']+["']/, `src="${url}"`));
            migrated++;
          }
          if (migrated > 0) {
            await (supabaseAdmin.from(src.table) as any).update({ [src.field]: nextHtml }).eq("id", row.id);
          }
        }
        report.push({
          table: src.table,
          id: row.id,
          label: row[src.labelField] ?? row.id,
          images: matches.length,
          migrated,
        });
      }
    }
    if (!data.dryRun) await audit(context, "media.migrate", "media", null, { items: report.length });
    return { dryRun: data.dryRun, report };
  });
