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
