import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  lead_name: z.string().trim().min(2, "Informe seu nome").max(120),
  lead_phone: z.string().trim().min(8, "Informe um WhatsApp válido").max(30),
  development: z.string().trim().min(1).max(120),
  goal: z.string().trim().min(1).max(60),
  budget: z.string().trim().max(80).optional().or(z.literal("")),
  partner: z.string().trim().min(1).max(60),
  landing_page: z.string().trim().max(500).optional().or(z.literal("")),
  lead_source: z.string().trim().max(60).optional(),
  empreendimento_slug: z.string().trim().max(120).optional(),
  conversion_context: z.string().trim().max(120).optional(),
});

export const submitPartnerLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const phone = data.lead_phone.replace(/\D/g, "");
    if (phone.length < 10 || phone.length > 13) {
      throw new Error("Informe um WhatsApp válido com DDD.");
    }

    const answers = {
      partner: data.partner,
      development: data.development,
      goal: data.goal,
      budget: data.budget || null,
      empreendimento_slug: data.empreendimento_slug ?? null,
      partner_slug: data.partner,
    };


    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("real_estate_radar_leads").insert({
      lead_name: data.lead_name,
      lead_phone: phone,
      interest_type: data.goal === "investir" ? "investimento" : "moradia",
      answers_json: answers,
      source: data.lead_source || "partner_page",
      campaign: data.partner,
      conversion_context: data.conversion_context || `partner_${data.partner}`,
      status: "novo",
      priority_level: "media",
      qualification_score: 0,
      privacy_consent: true,
      privacy_consent_at: new Date().toISOString(),
      form_version: "partner-1.0",
      landing_page: data.landing_page || null,
      profile_summary: `Interesse em ${data.development} (${data.goal})${data.budget ? ` — faixa ${data.budget}` : ""}`,
    });

    if (error) throw new Error("Não foi possível enviar agora. Tente novamente em instantes.");
    return { ok: true } as const;
  });
