import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractSaFicha } from "./importers/sa-ficha";
import { diffRecrawl, RECRAWL_FIELDS, type FieldChange, type OverrideConflict, type ReviewFlag } from "./importers/recrawl-diff";

export type RecrawlSimRow = {
  id: string; url: string; status: "mudaria" | "igual" | "indisponivel";
  changes: FieldChange[]; skippedOverrides: string[]; overrideConflicts: OverrideConflict[]; reviews: ReviewFlag[];
};

/** SIMULAÇÃO: lê a origem e compara com o banco. Não grava nada. */
export const simulateRecrawlBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ offset: z.number().int().min(0), limit: z.number().int().min(1).max(25) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cols = ["id", "source_url", "manual_overrides", ...RECRAWL_FIELDS].join(",");
    const { data: rows, error, count } = await supabaseAdmin
      .from("properties")
      .select(cols, { count: "exact" })
      .like("source_url", "%saimoveisalphaville%")
      .not("slug", "like", "%-duplicado")
      .order("id")
      .range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Error(error.message);
    const out: RecrawlSimRow[] = await Promise.all(((rows ?? []) as unknown as Record<string, unknown>[]).map(async (r) => {
      const url = String(r.source_url);
      let html = "";
      try {
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; SAImoveisBot)" } });
        html = res.ok ? await res.text() : "";
      } catch { /* indisponível */ }
      const f = extractSaFicha(html, url);
      if (!f.found) return { id: String(r.id), url, status: "indisponivel", changes: [], skippedOverrides: [], overrideConflicts: [], reviews: [] };
      const d = diffRecrawl(r, f);
      return { id: String(r.id), url, status: d.changes.length ? "mudaria" : "igual", changes: d.changes, skippedOverrides: d.skippedOverrides, overrideConflicts: d.overrideConflicts, reviews: d.reviews };
    }));
    return { rows: out, total: count ?? 0 };
  });
