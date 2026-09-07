import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Lista de oportunidades — captação de e-mail e WhatsApp.
 *
 * O disparo é manual: a equipe exporta os contatos e alimenta a lista de
 * transmissão à mão. Por isso esta camada faz duas coisas, e não uma:
 * guarda o contato **e** guarda a prova do consentimento (texto exibido,
 * versão da política, canal aceito, data, IP). Sem a segunda, a lista é
 * um passivo — a LGPD art. 8º §2º põe o ônus da prova no controlador.
 */

/**
 * Versão do texto de consentimento. **Suba esta versão sempre que o texto
 * mudar** — é o que permite provar o que cada pessoa leu no dia em que
 * aceitou.
 */
export const CONSENT_POLICY_VERSION = "oportunidades-1.0";

export const CONSENT_TEXT_EMAIL =
  "Quero receber por e-mail as oportunidades selecionadas pela S.A Imóveis Alphaville.";
export const CONSENT_TEXT_WHATSAPP =
  "Quero receber por WhatsApp as oportunidades selecionadas pela S.A Imóveis Alphaville.";

export const AUDIENCES = ["investidor", "corretor_parceiro", "comprador"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABEL: Record<Audience, string> = {
  investidor: "Investidor",
  corretor_parceiro: "Corretor parceiro",
  comprador: "Quero comprar para morar",
};

/** Normaliza para o formato que a lista de transmissão vai usar: 55 + DDD + número. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  // 55 + DDD (2) + 8 ou 9 dígitos
  if (withCountry.length < 12 || withCountry.length > 13) return null;
  return withCountry;
}

const subscribeSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().max(180).optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    audience: z.enum(AUDIENCES),
    consentEmail: z.boolean(),
    consentWhatsapp: z.boolean(),
    /** Campo isca: humano nunca preenche, robô preenche. */
    empresa: z.string().max(200).optional(),
    filters: z
      .object({
        regions: z.array(z.string().max(60)).max(10).optional(),
        propertyTypes: z.array(z.string().max(60)).max(10).optional(),
        priceMax: z.number().int().positive().max(999_000_000).nullable().optional(),
      })
      .default({}),
    landingPage: z.string().max(300).optional(),
    campaign: z.string().max(120).optional(),
  })

  .refine((d) => d.consentEmail || d.consentWhatsapp, {
    message: "Escolha ao menos um canal para receber as oportunidades.",
    path: ["consentEmail"],
  })
  .refine((d) => !d.consentEmail || Boolean(d.email), {
    message: "Informe o e-mail para receber por e-mail.",
    path: ["email"],
  })
  .refine((d) => !d.consentWhatsapp || Boolean(d.phone), {
    message: "Informe o WhatsApp para receber por WhatsApp.",
    path: ["phone"],
  });

export type SubscribeInput = z.infer<typeof subscribeSchema>;

/** Monta o texto exato que a pessoa leu, para arquivar junto do aceite. */
function consentText(consentEmail: boolean, consentWhatsapp: boolean): string {
  return [consentEmail ? CONSENT_TEXT_EMAIL : null, consentWhatsapp ? CONSENT_TEXT_WHATSAPP : null]
    .filter(Boolean)
    .join(" ");
}

export const subscribeToOpportunities = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => subscribeSchema.parse(d))
  .handler(async ({ data }) => {
    // Robô: devolvemos sucesso e não gravamos nada.
    if (data.empresa && data.empresa.trim() !== "") return { ok: true, updated: false };

    const guard = await import("./signup-guard.server");

    const phone = data.phone ? normalizePhone(data.phone) : null;
    if (data.phone && (!phone || !guard.localPhoneDigits(data.phone))) {
      throw new Error("Número de WhatsApp inválido. Use DDD + número.");
    }
    if (data.consentWhatsapp && !phone) {
      throw new Error("Número de WhatsApp inválido. Use DDD + número.");
    }

    const email = data.email ? data.email.trim().toLowerCase() : null;
    if (email && !guard.validEmail(email)) {
      throw new Error("Informe um e-mail válido.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const headers = getRequest()?.headers;

    const ipHash = guard.hashIp(guard.clientIp(headers));
    if (await guard.rateLimited(supabaseAdmin as never, ipHash, "oportunidades")) {
      throw new Error("Muitas tentativas agora. Tente novamente em alguns minutos.");
    }
    await guard.recordAttempt(supabaseAdmin as never, ipHash, "oportunidades");


    const payload = {
      name: data.name,
      email,
      phone,
      audience: data.audience,
      filters: data.filters,
      consent_email: data.consentEmail,
      consent_whatsapp: data.consentWhatsapp,
      consent_text: consentText(data.consentEmail, data.consentWhatsapp),
      policy_version: CONSENT_POLICY_VERSION,
      consent_at: new Date().toISOString(),
      consent_ip:
        headers?.get("cf-connecting-ip") ??
        headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        null,
      consent_user_agent: headers?.get("user-agent") ?? null,
      campaign: data.campaign ?? null,
      referrer: headers?.get("referer") ?? null,
      landing_page: data.landingPage ?? null,
      // Reinscrição reabre o cadastro de quem havia saído.
      unsubscribed_at: null,
    };

    // Quem já está na base atualiza o próprio registro em vez de duplicar.
    const existingQuery = supabaseAdmin
      .from("opportunity_subscribers")
      .select("id,consent_email,consent_whatsapp");
    const { data: existing } = email
      ? await existingQuery.eq("email", email).maybeSingle()
      : await existingQuery.eq("phone", phone!).maybeSingle();

    if (existing) {
      const row = existing as { id: string; consent_email: boolean; consent_whatsapp: boolean };
      const { error } = await supabaseAdmin
        .from("opportunity_subscribers")
        .update({
          ...payload,
          // Consentimento é aditivo: um canal já aceito não é revogado por
          // um novo cadastro que não o marcou.
          consent_email: row.consent_email || data.consentEmail,
          consent_whatsapp: row.consent_whatsapp || data.consentWhatsapp,
        })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
      return { ok: true, updated: true };
    }

    const { error } = await supabaseAdmin.from("opportunity_subscribers").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true, updated: false };
  });

/** Descadastro público. A LGPD art. 8º §5º exige revogação gratuita e facilitada. */
export const unsubscribeFromOpportunities = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ contact: z.string().trim().min(5).max(180) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const asPhone = normalizePhone(data.contact);
    const asEmail = data.contact.includes("@") ? data.contact.toLowerCase() : null;

    if (!asEmail && !asPhone) {
      throw new Error("Informe o e-mail ou o WhatsApp cadastrado.");
    }

    const query = supabaseAdmin
      .from("opportunity_subscribers")
      .update({ unsubscribed_at: new Date().toISOString() });

    const { error } = asEmail
      ? await query.eq("email", asEmail)
      : await query.eq("phone", asPhone!);
    if (error) throw new Error(error.message);

    // Resposta sempre igual: confirmar se um contato está ou não na base
    // seria vazar dado de terceiro para quem só digitou um telefone.
    return { ok: true };
  });

// -------------------------------------------------------------------- admin

type RoleChecker = {
  rpc: (
    fn: "has_role",
    args: { _user_id: string; _role: "admin" | "editor" },
  ) => PromiseLike<{ data: boolean | null }>;
};

async function assertEditor(ctx: { supabase: RoleChecker; userId: string }) {
  const [{ data: isAdmin }, { data: isEditor }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "editor" }),
  ]);
  if (!isAdmin && !isEditor) throw new Error("Forbidden");
}

export type SubscriberRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  audience: Audience;
  filters: { regions?: string[]; propertyTypes?: string[]; priceMax?: number | null };
  consent_email: boolean;
  consent_whatsapp: boolean;
  consent_text: string;
  policy_version: string;
  consent_at: string;
  broadcast_added_at: string | null;
  unsubscribed_at: string | null;
  source: string;
  created_at: string;
};

export const listSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SubscriberRow[]> => {
    await assertEditor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("opportunity_subscribers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as SubscriberRow[];
  });

/** Marca quem já foi incluído na lista de transmissão, para não repetir. */
export const markBroadcastAdded = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(500), added: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertEditor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("opportunity_subscribers")
      .update({ broadcast_added_at: data.added ? new Date().toISOString() : null })
      .in("id", data.ids);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("cms_audit_log").insert({
      actor_id: context.userId,
      action: data.added ? "subscribers.broadcast_added" : "subscribers.broadcast_cleared",
      entity_type: "opportunity_subscriber",
      entity_id: null,
      details: { count: data.ids.length },
    });

    return { ok: true, count: data.ids.length };
  });

/** Descadastro feito pela equipe, quando o pedido chega por outro canal. */
export const unsubscribeSubscriber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertEditor(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("opportunity_subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
