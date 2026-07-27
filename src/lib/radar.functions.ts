import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RADAR_FORM_VERSION } from "./radar-config";
import { buildNextStep, buildProfileSummary, calculatePriority, calculateScore } from "./radar-scoring";

const answerValue = z.union([z.string().max(400), z.array(z.string().max(200)).max(30)]);

const submitSchema = z.object({
  interest_type: z.string().trim().min(1).max(60),
  answers: z.record(z.string().max(80), answerValue).default({}),
  lead_name: z.string().trim().min(2, "Informe seu nome").max(120),
  lead_phone: z.string().trim().max(30).optional().or(z.literal("")),
  lead_email: z.string().trim().max(255).email("E-mail inválido").optional().or(z.literal("")),
  lead_current_city: z.string().trim().max(120).optional().or(z.literal("")),
  preferred_contact_channel: z.string().trim().max(40).optional().or(z.literal("")),
  preferred_contact_period: z.string().trim().max(60).optional().or(z.literal("")),
  privacy_consent: z.literal(true),
  campaign: z.string().trim().max(160).optional().or(z.literal("")),
  medium: z.string().trim().max(160).optional().or(z.literal("")),
  content: z.string().trim().max(160).optional().or(z.literal("")),
  term: z.string().trim().max(160).optional().or(z.literal("")),
  source: z.string().trim().max(80).optional().or(z.literal("")),
  referrer: z.string().trim().max(500).optional().or(z.literal("")),
  landing_page: z.string().trim().max(500).optional().or(z.literal("")),
});

const digits = (v?: string | null) => (v ? v.replace(/\D/g, "") : "");
const clean = (v?: string | null) => {
  const t = (v ?? "").trim();
  return t.length ? t : null;
};

export const submitRadarLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ data }) => {
    const phone = digits(data.lead_phone);
    const email = clean(data.lead_email)?.toLowerCase() ?? null;
    if (!phone && !email) throw new Error("Informe ao menos um meio de contato válido.");
    if (phone && (phone.length < 10 || phone.length > 13)) throw new Error("Informe um WhatsApp válido com DDD.");

    const contact = {
      lead_name: data.lead_name,
      lead_phone: phone || null,
      lead_email: email,
      lead_current_city: clean(data.lead_current_city),
      preferred_contact_channel: clean(data.preferred_contact_channel),
      preferred_contact_period: clean(data.preferred_contact_period),
    };

    const answers = data.answers ?? {};
    const priority_level = calculatePriority(data.interest_type, answers);
    const payload = {
      ...contact,
      interest_type: data.interest_type,
      answers_json: answers,
      qualification_score: calculateScore(data.interest_type, answers, contact),
      priority_level,
      profile_summary: buildProfileSummary(data.interest_type, answers, contact),
      recommended_next_step: buildNextStep(data.interest_type, answers, priority_level),
      privacy_consent: true,
      privacy_consent_at: new Date().toISOString(),
      form_version: RADAR_FORM_VERSION,
      source: clean(data.source) ?? "homepage_radar",
      campaign: clean(data.campaign),
      medium: clean(data.medium),
      content: clean(data.content),
      term: clean(data.term),
      referrer: clean(data.referrer),
      landing_page: clean(data.landing_page),
      conversion_context: "real_estate_radar",
      status: "radar_recebido",
    };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Deduplicação por telefone ou e-mail: atualiza o contato existente em vez de duplicar.
    let existingId: string | null = null;
    if (phone) {
      const { data: found } = await supabaseAdmin
        .from("real_estate_radar_leads")
        .select("id")
        .eq("lead_phone", phone)
        .maybeSingle();
      existingId = found?.id ?? null;
    }
    if (!existingId && email) {
      const { data: found } = await supabaseAdmin
        .from("real_estate_radar_leads")
        .select("id")
        .ilike("lead_email", email)
        .maybeSingle();
      existingId = found?.id ?? null;
    }

    if (existingId) {
      const { error } = await supabaseAdmin
        .from("real_estate_radar_leads")
        .update(payload)
        .eq("id", existingId);
      if (error) {
        console.error("[radar] update lead failed", error.message);
        throw new Error("Não foi possível registrar agora. Tente novamente.");
      }
      return { ok: true as const, id: existingId, deduplicated: true, summary: payload.profile_summary };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("real_estate_radar_leads")
      .insert(payload)
      .select("id")
      .single();
    if (error) {
      console.error("[radar] insert lead failed", error.message);
      throw new Error("Não foi possível registrar agora. Tente novamente.");
    }
    return { ok: true as const, id: inserted.id, deduplicated: false, summary: payload.profile_summary };
  });

export const listRadarLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("real_estate_radar_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateRadarLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: string }) =>
    z.object({ id: z.string().uuid(), status: z.string().max(40) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("real_estate_radar_leads")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
