import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  calculateFinancing,
  calculateSimulationPriority,
  calculateSimulationScore,
  type AmortizationSystem,
} from "./financing-calc";

const clean = (v?: string | null) => {
  const t = (v ?? "").trim();
  return t.length ? t : null;
};
const digits = (v?: string | null) => (v ? v.replace(/\D/g, "") : "");

// ---------------------------------------------------------------------------
// Configurações públicas (taxa de referência etc.) — lidas pelo simulador
// no carregamento da página, editáveis no admin sem precisar de deploy.
// ---------------------------------------------------------------------------

export const getFinancingSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("financing_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  return (
    data ?? {
      default_annual_rate: 11.2,
      min_down_payment_pct: 10,
      max_term_months: 420,
      fgts_example_amount: 40000,
    }
  );
});

export const updateFinancingSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        default_annual_rate: z.number().min(0).max(40),
        min_down_payment_pct: z.number().min(0).max(90),
        max_term_months: z.number().int().min(12).max(480),
        fgts_example_amount: z.number().min(0),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("financing_settings").update(data).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// Bancos parceiros — taxas médias por instituição, editáveis no admin.
// ---------------------------------------------------------------------------

export const listFinancingBanks = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("financing_banks")
    .select("*")
    .eq("active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listAllFinancingBanks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("financing_banks")
      .select("*")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const bankSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(120),
  logo_url: z.string().trim().max(1000).optional().or(z.literal("")),
  site_url: z.string().trim().max(1000).optional().or(z.literal("")),
  annual_rate: z.number().min(0).max(40),
  min_down_payment_pct: z.number().min(0).max(90),
  max_financing_pct: z.number().min(10).max(100),
  min_term_months: z.number().int().min(12).max(480),
  max_term_months: z.number().int().min(12).max(480),
  allows_price: z.boolean(),
  allows_sac: z.boolean(),
  accepts_fgts: z.boolean(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  display_order: z.number().int().min(0).max(999),
  active: z.boolean(),
});

export const upsertFinancingBank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => bankSchema.parse(data))
  .handler(async ({ data, context }) => {
    const payload = {
      name: data.name,
      slug: data.slug
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      logo_url: clean(data.logo_url),
      site_url: clean(data.site_url),
      annual_rate: data.annual_rate,
      min_down_payment_pct: data.min_down_payment_pct,
      max_financing_pct: data.max_financing_pct,
      min_term_months: data.min_term_months,
      max_term_months: data.max_term_months,
      allows_price: data.allows_price,
      allows_sac: data.allows_sac,
      accepts_fgts: data.accepts_fgts,
      notes: clean(data.notes),
      display_order: data.display_order,
      active: data.active,
    };

    const q = data.id
      ? context.supabase.from("financing_banks").update(payload).eq("id", data.id)
      : context.supabase.from("financing_banks").insert(payload);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteFinancingBank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("financing_banks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// Registro de simulação. Chamado sem contato (passo 1, silencioso, para
// analytics de qual imóvel gera mais simulações) e depois atualizado com
// os dados de contato quando a pessoa pede para falar com um corretor.
// ---------------------------------------------------------------------------

const simulateSchema = z.object({
  property_id: z.string().uuid().optional(),
  property_slug: z.string().max(200).optional(),
  property_value: z.number().positive(),
  down_payment_pct: z.number().min(0).max(90),
  used_fgts: z.boolean().default(false),
  fgts_amount: z.number().min(0).default(0),
  term_months: z.number().int().min(12).max(480),
  annual_rate: z.number().min(0).max(40),
  amortization_system: z.enum(["price", "sac"]),
  bank_id: z.string().uuid().optional(),
  bank_name: z.string().max(120).optional(),
  source: z.string().max(80).optional(),
  campaign: z.string().max(160).optional(),
  medium: z.string().max(160).optional(),
  referrer: z.string().max(500).optional(),
  landing_page: z.string().max(500).optional(),
});


export const registerFinancingSimulation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => simulateSchema.parse(data))
  .handler(async ({ data }) => {
    const input = {
      propertyValue: data.property_value,
      downPaymentPct: data.down_payment_pct,
      usedFgts: data.used_fgts,
      fgtsAmount: data.fgts_amount,
      termMonths: data.term_months,
      annualRatePct: data.annual_rate,
      system: data.amortization_system as AmortizationSystem,
    };
    const result = calculateFinancing(input);
    const score = calculateSimulationScore(input, result, false);
    const priority = calculateSimulationPriority(score);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inserted, error } = await supabaseAdmin
      .from("financing_simulations")
      .insert({
        property_id: data.property_id ?? null,
        property_slug: clean(data.property_slug),
        property_value: data.property_value,
        down_payment: result.downPayment,
        down_payment_pct: data.down_payment_pct,
        used_fgts: data.used_fgts,
        term_months: data.term_months,
        annual_rate: data.annual_rate,
        amortization_system: data.amortization_system,
        financed_amount: result.financedAmount,
        first_installment: result.firstInstallment,
        last_installment: result.lastInstallment,
        total_paid: result.totalPaid,
        total_interest: result.totalInterest,
        suggested_min_income: result.suggestedMinIncome,
        qualification_score: score,
        priority_level: priority,
        source: clean(data.source) ?? "property_page_simulator",
        campaign: clean(data.campaign),
        medium: clean(data.medium),
        referrer: clean(data.referrer),
        landing_page: clean(data.landing_page),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[financing] insert simulation failed", error.message);
      throw new Error("Não foi possível registrar a simulação agora.");
    }

    return { ok: true as const, id: inserted.id, result };
  });

// ---------------------------------------------------------------------------
// Converte uma simulação existente em lead: acrescenta contato e reforça
// o score (mesma régua de calculateSimulationScore, agora com hasContact=true).
// ---------------------------------------------------------------------------

const convertSchema = z.object({
  simulation_id: z.string().uuid(),
  lead_name: z.string().trim().min(2, "Informe seu nome").max(120),
  lead_phone: z.string().trim().max(30).optional().or(z.literal("")),
  lead_email: z.string().trim().max(255).email("E-mail inválido").optional().or(z.literal("")),
});

export const convertSimulationToLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => convertSchema.parse(data))
  .handler(async ({ data }) => {
    const phone = digits(data.lead_phone);
    const email = clean(data.lead_email)?.toLowerCase() ?? null;
    if (!phone && !email) throw new Error("Informe ao menos um meio de contato válido.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sim, error: fetchError } = await supabaseAdmin
      .from("financing_simulations")
      .select("*")
      .eq("id", data.simulation_id)
      .maybeSingle();
    if (fetchError || !sim) throw new Error("Simulação não encontrada.");

    const input = {
      propertyValue: Number(sim.property_value),
      downPaymentPct: Number(sim.down_payment_pct),
      usedFgts: sim.used_fgts,
      fgtsAmount: 0,
      termMonths: sim.term_months,
      annualRatePct: Number(sim.annual_rate),
      system: sim.amortization_system as AmortizationSystem,
    };
    const result = calculateFinancing(input);
    const score = calculateSimulationScore(input, result, true);
    const priority = calculateSimulationPriority(score);

    const { error } = await supabaseAdmin
      .from("financing_simulations")
      .update({
        lead_name: data.lead_name,
        lead_phone: phone || null,
        lead_email: email,
        converted_to_lead: true,
        qualification_score: score,
        priority_level: priority,
      })
      .eq("id", data.simulation_id);

    if (error) {
      console.error("[financing] convert to lead failed", error.message);
      throw new Error("Não foi possível registrar seus dados agora.");
    }

    return { ok: true as const };
  });

export const listFinancingSimulations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("financing_simulations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
