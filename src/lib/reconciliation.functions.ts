import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** "Rodar agora" no Admin: mesma rotina da verificação diária. */
export const runReconciliationNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { skipImports?: boolean }) => d ?? {})
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Apenas administradores");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runReconciliation } = await import("./reconciliation.server");
    const r = await runReconciliation(supabaseAdmin, { triggeredBy: "admin", skipImports: data.skipImports });
    return JSON.parse(JSON.stringify(r)) as { status: string; error?: string };
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Apenas administradores");
}

/** Aprova a desativação segurada pelo limite de 50 por execução. */
export const approveHeldDeactivationNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { runId: string }) => ({ runId: String(d?.runId ?? "") }))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { approveHeldDeactivation } = await import("./reconciliation.server");
    return approveHeldDeactivation(supabaseAdmin, data.runId);
  });

/** Alertas de código: fora do padrão (2 letras + 5 dígitos) e código repetido em dois imóveis. */
export const listCodeAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { fetchAllRows } = await import("./fetch-all");
    const { codeAnomaly } = await import("./tokko-sync.server");
    const rows = await fetchAllRows<{ id: string; slug: string; internal_code: string | null; status: string }>((f, t) =>
      supabaseAdmin.from("properties").select("id,slug,internal_code,status").eq("status", "active").order("created_at").range(f, t));
    const byCode = new Map<string, typeof rows>();
    for (const r of rows) {
      const c = (r.internal_code ?? "").trim().toUpperCase();
      if (c) byCode.set(c, [...(byCode.get(c) ?? []), r]);
    }
    const duplicates = [...byCode].filter(([, l]) => l.length > 1).map(([code, l]) => ({ code, slugs: l.map((x) => x.slug) }));
    const nonStandard = rows.map((r) => ({ code: r.internal_code, slug: r.slug, reason: codeAnomaly(r.internal_code) }))
      .filter((r) => r.reason && r.reason !== "sem código");
    return { duplicates, nonStandard };
  });
