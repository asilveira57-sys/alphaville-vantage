// Avisos no celular (Web Push). Chaves VAPID em app_private_settings (key='vapid'),
// geradas aqui no primeiro uso para nunca passarem pelo repositório.
import type { SupabaseClient } from "@supabase/supabase-js";
import { b64uEncode, sendWebPush, type VapidKeys } from "@/lib/web-push.server";
import { serviceDb } from "@/lib/staff.server";

let cached: VapidKeys | null = null;

export async function getVapidKeys(sb?: SupabaseClient): Promise<VapidKeys> {
  if (cached) return cached;
  const db = sb ?? (await serviceDb());
  const read = async () => {
    const { data } = await db.from("app_private_settings").select("value").eq("key", "vapid").maybeSingle();
    const v = data?.value as { public_key?: string; private_jwk?: JsonWebKey; subject?: string } | undefined;
    return v?.public_key && v.private_jwk ? { publicKey: v.public_key, privateJwk: v.private_jwk, subject: v.subject ?? "mailto:contato@saimoveisalpha.com.br" } : null;
  };
  let keys = await read();
  if (!keys) {
    const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    const publicKey = b64uEncode(await crypto.subtle.exportKey("raw", pair.publicKey));
    await db
      .from("app_private_settings")
      .upsert(
        { key: "vapid", value: { public_key: publicKey, private_jwk: privateJwk, subject: "mailto:contato@saimoveisalpha.com.br" } },
        { onConflict: "key", ignoreDuplicates: true },
      );
    keys = await read(); // outra execução pode ter gravado primeiro
  }
  if (!keys) throw new Error("Não foi possível preparar as chaves de aviso.");
  cached = keys;
  return keys;
}

export type PushMessage = { title: string; body: string; url: string; tag?: string };

/** Envia para as inscrições dos usuários indicados (ou de toda a equipe). Remove inscrições mortas. */
export async function pushToUsers(userIds: string[] | "staff", msg: PushMessage): Promise<{ sent: number; failed: number }> {
  const sb = await serviceDb();
  let ids: string[];
  if (userIds === "staff") {
    const { data } = await sb.from("user_roles").select("user_id").in("role", ["admin", "corretor"]);
    ids = [...new Set(((data ?? []) as { user_id: string }[]).map((r) => r.user_id))];
  } else ids = userIds;
  if (!ids.length) return { sent: 0, failed: 0 };
  const { data: subs } = await sb.from("push_subscriptions").select("id,endpoint,p256dh,auth").in("user_id", ids);
  if (!subs?.length) return { sent: 0, failed: 0 };
  const keys = await getVapidKeys(sb);
  let sent = 0;
  let failed = 0;
  await Promise.all(
    (subs as { id: string; endpoint: string; p256dh: string; auth: string }[]).map(async (s) => {
      try {
        const status = await sendWebPush(s, msg, keys);
        if (status >= 200 && status < 300) {
          sent++;
          await sb.from("push_subscriptions").update({ last_ok_at: new Date().toISOString() }).eq("id", s.id);
        } else {
          failed++;
          if (status === 404 || status === 410) await sb.from("push_subscriptions").delete().eq("id", s.id);
          else console.error("[push] status", status);
        }
      } catch (e) {
        failed++;
        console.error("[push] erro", e);
      }
    }),
  );
  return { sent, failed };
}

/** Aviso de lead novo para a equipe. Só uma vez por lead e só para leads recentes. Nunca lança. */
export async function notifyNewLead(leadId: string) {
  try {
    const sb = await serviceDb();
    const since = new Date(Date.now() - 30 * 60_000).toISOString();
    const { data: lead } = await sb
      .from("leads")
      .update({ pushed_at: new Date().toISOString() })
      .eq("id", leadId)
      .is("pushed_at", null)
      .is("owner_user_id", null)
      .neq("source", "proposta")
      .gte("created_at", since)
      .select("id,name,source_label,summary")
      .maybeSingle();
    if (!lead) return;
    const first = String(lead.name ?? "").trim().split(/\s+/)[0] || "Novo contato";
    await pushToUsers("staff", {
      title: `Novo lead · ${lead.source_label ?? "Portal"}`,
      body: [first, lead.summary].filter(Boolean).join(" — ").slice(0, 160),
      url: `/corretor/leads/${lead.id}`,
      tag: `lead-${lead.id}`,
    });
  } catch (e) {
    console.error("[push] notifyNewLead", e);
  }
}
