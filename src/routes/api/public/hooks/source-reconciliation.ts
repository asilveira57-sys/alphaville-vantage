import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

// Sincronização: 5h e de hora em hora das 7h às 22h (Brasília), via pg_cron. Autenticada por x-cron-secret.
export const Route = createFileRoute("/api/public/hooks/source-reconciliation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkCronAuth, ranRecently, recordRun } = await import("@/lib/cron-auth.server");
        const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const guard = await checkCronAuth(request, sb);
        if (!guard.ok) return guard.response;
        if (await ranRecently(sb, "source-reconciliation", 45)) return new Response("Too Many Requests", { status: 429 });
        await recordRun(sb, "source-reconciliation", {});
        const { runReconciliation } = await import("@/lib/reconciliation.server");
        const r = await runReconciliation(sb, { triggeredBy: "cron" });
        return Response.json(r);
      },
    },
  },
});
