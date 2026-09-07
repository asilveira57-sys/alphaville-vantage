import { createHash } from "node:crypto";

/**
 * Freio anti-robô dos formulários públicos de captação.
 *
 * Não guardamos IP em texto claro: só um hash com sal do ambiente, que
 * serve para contar tentativas e nada mais.
 */

export const MAX_ATTEMPTS = 3;
export const WINDOW_MINUTES = 10;

export function hashIp(ip: string | null): string {
  const salt = process.env["SIGNUP_IP_SALT"] ?? "";
  return createHash("sha256")
    .update(`${salt}:${ip ?? "unknown"}`)
    .digest("hex");
}

export function clientIp(headers: Headers | undefined): string | null {
  return (
    headers?.get("cf-connecting-ip") ??
    headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

type Sb = {
  from: (t: string) => any;
};

/** true quando a origem já estourou o limite da janela. */
export async function rateLimited(sb: Sb, ipHash: string, kind: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count, error } = await sb
    .from("signup_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("kind", kind)
    .gte("created_at", since);
  if (error) return false;
  return (count ?? 0) >= MAX_ATTEMPTS;
}

export async function recordAttempt(sb: Sb, ipHash: string, kind: string) {
  try {
    await sb.from("signup_attempts").insert({ ip_hash: ipHash, kind });
  } catch {
    /* o registro do freio nunca pode derrubar a inscrição */
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function validEmail(value: string): boolean {
  return value.length <= 180 && EMAIL_RE.test(value);
}

/** Aceita só 10 ou 11 dígitos (DDD + número), depois de limpar a máscara. */
export function localPhoneDigits(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  return digits.length === 10 || digits.length === 11 ? digits : null;
}
