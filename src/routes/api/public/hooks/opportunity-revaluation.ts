import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { runValuationSweep } from "@/lib/opportunities.functions";

/**
 * Reapuração mensal do selo de preço, chamada pelo pg_cron.
 *
 * A data que aparece no anúncio é a da última apuração — sem esta rotina,
 * um selo apurado em março continuaria na tela em setembro, o que é
 * exatamente o tipo de alegação desatualizada que não se sustenta.
 *
 * Autenticado pelo header x-cron-secret, no mesmo padrão do hook de SEO.
 */
export const Route = createFileRoute("/api/public/hooks/opportunity-revaluation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkCronSecret, ranRecently, recordRun } = await import("@/lib/cron-auth.server");
        const guard = checkCronSecret(request);
        if (!guard.ok) return guard.response;

        const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });

        if (await ranRecently(sb, "opportunity-revaluation", 10)) {
          return new Response("Too Many Requests", { status: 429 });
        }

        const { results } = await runValuationSweep(sb as never, { computedBy: null });

        await recordRun(sb, "opportunity-revaluation", { appraised: results.length });

        return Response.json({
          ok: true,
          appraised: results.length,
          with_badge: results.filter((r) => r.qualifies).length,
          without_badge: results
            .filter((r) => !r.qualifies)
            .map((r) => ({
              slug: r.slug,
              reason: r.skippedReason,
            })),
        });
      },
    },
  },
});
