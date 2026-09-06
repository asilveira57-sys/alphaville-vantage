import { timingSafeEqual } from "crypto";

/**
 * Autenticação dos endpoints agendados (pg_cron / agendadores externos).
 * Nunca usar chaves com prefixo VITE_: elas vão para o navegador.
 */
export type CronGuardResult = { ok: true } | { ok: false; response: Response };

export function checkCronSecret(request: Request): CronGuardResult {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return {
      ok: false,
      response: new Response("Cron secret not configured", { status: 503 }),
    };
  }

  const provided = request.headers.get("x-cron-secret") ?? "";
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(secret, "utf8");
  const equal = a.length === b.length && timingSafeEqual(a, b);
  if (!equal) {
    return { ok: false, response: new Response("Unauthorized", { status: 401 }) };
  }
  return { ok: true };
}

/** Retorna true quando já houve execução bem-sucedida nos últimos `minutes`. */
export async function ranRecently(sb: any, hook: string, minutes = 10): Promise<boolean> {
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const { data, error } = await sb
    .from("cron_hook_runs")
    .select("id")
    .eq("hook", hook)
    .gte("created_at", since)
    .limit(1);
  if (error) return false;
  return (data ?? []).length > 0;
}

export async function recordRun(sb: any, hook: string, details?: Record<string, unknown>) {
  try {
    await sb.from("cron_hook_runs").insert({ hook, details: details ?? {} });
  } catch {
    /* o log jamais deve derrubar a rotina */
  }
}

/**
 * Autenticação completa: aceita o segredo do ambiente (CRON_SECRET) ou o
 * segredo guardado em public.cron_secrets, lido apenas com a chave de serviço.
 * Nenhum dos dois chega ao navegador.
 */
export async function checkCronAuth(request: Request, sb: any): Promise<CronGuardResult> {
  const provided = request.headers.get("x-cron-secret") ?? "";
  const candidates: string[] = [];
  if (process.env.CRON_SECRET) candidates.push(process.env.CRON_SECRET);

  const { data } = await sb.from("cron_secrets").select("secret").eq("name", "cron").maybeSingle();
  if (data?.secret) candidates.push(data.secret);

  if (candidates.length === 0) {
    return { ok: false, response: new Response("Cron secret not configured", { status: 503 }) };
  }

  const a = Buffer.from(provided, "utf8");
  const match = candidates.some((c) => {
    const b = Buffer.from(c, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  });
  if (!match) return { ok: false, response: new Response("Unauthorized", { status: 401 }) };
  return { ok: true };
}
