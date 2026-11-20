import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

/** Ficha em PDF (rua, bairro…) liberada em troca de nome + e-mail + WhatsApp. Entra no CRM como lead "ficha". */
export const GUIDE_LEAD_CONSENT = "Autorizo a S.A Imóveis Alphaville a entrar em contato comigo sobre imóveis da região.";

const GUIDE_LABEL = { rua: "Ficha da rua", bairro: "Ficha do bairro", condominio: "Ficha do condomínio" } as const;

const schema = z.object({
  kind: z.enum(["rua", "bairro", "condominio"]),
  slug: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(200),
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().toLowerCase().max(180),
  phone: z.string().trim().max(40),
  consent: z.boolean(),
  landing_page: z.string().trim().max(300).optional().or(z.literal("")),
  empresa: z.string().max(200).optional().or(z.literal("")), // campo isca
});

export const submitGuideLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    if (data.empresa) return { ok: true as const };
    const guard = await import("./signup-guard.server");
    if (!guard.validEmail(data.email)) throw new Error("Informe um e-mail válido.");
    const local = guard.localPhoneDigits(data.phone);
    if (!local) throw new Error("WhatsApp inválido. Use DDD + número.");
    const phone = `55${local}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const headers = getRequest()?.headers;
    const ipHash = guard.hashIp(guard.clientIp(headers));
    if (await guard.rateLimited(supabaseAdmin as never, ipHash, "ficha")) {
      throw new Error("Muitas tentativas agora. Tente novamente em alguns minutos.");
    }
    await guard.recordAttempt(supabaseAdmin as never, ipHash, "ficha");

    const id = crypto.randomUUID();
    const { error } = await supabaseAdmin.rpc("upsert_lead", {
      p_source: "ficha",
      p_label: GUIDE_LABEL[data.kind as keyof typeof GUIDE_LABEL],
      p_table: "guide_downloads",
      p_id: id,
      p_name: data.name,
      p_phone: phone,
      p_email: data.email,
      p_page: data.landing_page || null,
      p_summary: `Baixou a ${GUIDE_LABEL[data.kind as keyof typeof GUIDE_LABEL].toLowerCase()}: ${data.title}`,
      p_payload: { kind: data.kind, slug: data.slug, title: data.title, consent: data.consent, consent_text: data.consent ? GUIDE_LEAD_CONSENT : null },
      p_created: new Date().toISOString(),
    } as never);
    if (error) {
      console.error("[ficha] upsert_lead", error.message);
      throw new Error("Não foi possível registrar agora. Tente novamente.");
    }
    const { dispatchLeadEmails } = await import("./lead-emails.server");
    await dispatchLeadEmails("guide_downloads", id);
    return { ok: true as const };
  });
