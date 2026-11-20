import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AreaOverview } from "./street-overview";

/** Números ao vivo de um guia de bairro (RPC area_overview, filtro em editorial_pages.area_filter). */
export const getAreaOverview = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data: row, error } = await sb.rpc("area_overview" as never, { p_slug: data.slug } as never);
    if (error) {
      console.error("[bairro] area_overview", error.message);
      return null;
    }
    return (row ?? null) as unknown as AreaOverview | null;
  });
