import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MissingPhotoRow = {
  kind: "guia_condominio" | "guia" | "bairro" | "post" | "condominio" | "rua" | "imovel";
  id: string;
  title: string;
  slug: string;
  status: string;
  detail: string;
};

/**
 * Admin report "Sem foto real": everything that falls back to the neutral brand
 * background. The database function itself refuses non-admin callers.
 */
export const listMissingRealPhotos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("missing_real_photos");
    if (error) throw new Error(error.message);
    return (data ?? []) as MissingPhotoRow[];
  });
