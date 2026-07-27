// Regras puras de qualificação do Radar (score, prioridade, resumo, próximo passo).
// Sem IA externa — usado no servidor e reaproveitável no cliente.
import { interestLabel, type RadarAnswers } from "./radar-config";

export type RadarContact = {
  lead_name: string;
  lead_phone?: string | null;
  lead_email?: string | null;
  lead_current_city?: string | null;
  preferred_contact_channel?: string | null;
  preferred_contact_period?: string | null;
};

const REGION_FIELDS = ["preferred_regions", "rental_regions", "investment_regions", "development_regions", "current_region", "target_location", "seller_property_location", "landlord_property_location"];
const TYPE_FIELDS = ["property_type", "rental_property_type", "investment_asset_type", "development_type", "land_type", "desired_house_type", "seller_property_type", "landlord_property_type", "opportunity_type"];
const BUDGET_FIELDS = ["purchase_budget", "monthly_housing_budget", "investment_capital", "available_down_payment", "land_budget", "house_purchase_budget", "relocation_budget", "relocation_rent_budget", "maximum_opportunity_value", "expected_sale_price", "expected_monthly_rent", "decision_value_range"];
const TIMELINE_FIELDS = ["move_timeline", "rental_start_date", "land_purchase_timeline", "house_move_timeline", "sale_timeline", "property_available_date", "opportunity_urgency", "decision_timeline", "delivery_timeline", "investment_horizon"];
const PAYMENT_FIELDS = ["payment_method", "investment_payment_method", "rental_guarantee", "monthly_construction_payment"];
const FEATURE_FIELDS = ["must_have_features", "rental_requirements", "land_features", "house_essential_spaces", "important_locations", "mandatory_opportunity_features"];

const UNDEFINED_VALUES = ["ainda não defini", "ainda não sei", "não sei informar", "ainda estou avaliando", "preciso analisar", "não tenho preferência", "sem prazo definido", "depende das condições"];

function val(answers: RadarAnswers, field: string): string {
  const v = answers[field];
  if (Array.isArray(v)) return v.join(", ");
  return (v ?? "").toString().trim();
}

function firstFilled(answers: RadarAnswers, fields: string[]): string {
  for (const f of fields) {
    const v = val(answers, f);
    if (v && !UNDEFINED_VALUES.includes(v.toLowerCase())) return v;
  }
  return "";
}

const SHORT_TERM = ["imediatamente", "o quanto antes", "em até 3 meses", "nos próximos 30 dias", "de 1 a 3 meses", "em até 30 dias", "estou pronto para fechar", "pretendo fechar em até 3 meses", "até 1 ano"];
const MID_TERM = ["de 3 a 6 meses", "de 6 a 12 meses", "depois de 3 meses", "depois de 6 meses", "de 1 a 2 anos", "até 2 anos", "estou monitorando oportunidades"];

export function calculateScore(interest: string, answers: RadarAnswers, contact: RadarContact): number {
  let score = 0;
  if (interest) score += 15;
  if (firstFilled(answers, REGION_FIELDS)) score += 10;
  if (firstFilled(answers, TYPE_FIELDS)) score += 10;
  if (firstFilled(answers, BUDGET_FIELDS)) score += 20;
  const timeline = firstFilled(answers, TIMELINE_FIELDS).toLowerCase();
  if (SHORT_TERM.includes(timeline)) score += 20;
  else if (MID_TERM.includes(timeline)) score += 10;
  if (firstFilled(answers, PAYMENT_FIELDS)) score += 10;
  if (firstFilled(answers, FEATURE_FIELDS)) score += 5;
  if (contact.lead_name && contact.lead_phone && contact.lead_email) score += 10;
  return Math.max(0, Math.min(100, score));
}

export function calculatePriority(interest: string, answers: RadarAnswers): "high" | "medium" | "initial" {
  const timeline = firstFilled(answers, TIMELINE_FIELDS).toLowerCase();
  const budget = firstFilled(answers, BUDGET_FIELDS);
  const idle = val(answers, "idle_duration").toLowerCase();
  const occupancy = val(answers, "property_occupancy_status").toLowerCase();
  const rentalStatus = val(answers, "rental_availability_status").toLowerCase();
  const listing = `${val(answers, "listing_status")} ${val(answers, "rental_listing_status")}`.toLowerCase();
  const dependency = val(answers, "current_property_dependency").toLowerCase();

  const highSignals =
    SHORT_TERM.includes(timeline) ||
    (!!budget && SHORT_TERM.includes(timeline)) ||
    occupancy === "vazio" ||
    rentalStatus === "vazio" ||
    ["de 6 a 12 meses", "há mais de 1 ano"].includes(idle) ||
    listing.includes("sem resultado") ||
    dependency.startsWith("preciso vender") ||
    (interest === "real_estate_investment" && !!budget);

  if (highSignals) return "high";
  if ((!!budget || MID_TERM.includes(timeline)) && !!interest) return "medium";
  return "initial";
}

export function buildProfileSummary(interest: string, answers: RadarAnswers, contact: RadarContact): string {
  const parts: string[] = [];
  parts.push(`Objetivo: ${interestLabel(interest).toLowerCase()}`);
  const type = firstFilled(answers, TYPE_FIELDS);
  if (type) parts.push(`tipo de imóvel: ${type.toLowerCase()}`);
  const region = firstFilled(answers, REGION_FIELDS);
  if (region) parts.push(`região: ${region}`);
  const bedrooms = firstFilled(answers, ["bedrooms", "rental_bedrooms"]);
  if (bedrooms) parts.push(`${bedrooms.toLowerCase()}`);
  const features = firstFilled(answers, FEATURE_FIELDS);
  if (features) parts.push(`prioridades: ${features.toLowerCase()}`);
  const budget = firstFilled(answers, BUDGET_FIELDS);
  if (budget) parts.push(`faixa de valor: ${budget}`);
  const payment = firstFilled(answers, PAYMENT_FIELDS);
  if (payment) parts.push(`forma de pagamento: ${payment.toLowerCase()}`);
  const timeline = firstFilled(answers, TIMELINE_FIELDS);
  if (timeline) parts.push(`prazo: ${timeline.toLowerCase()}`);
  if (contact.lead_current_city) parts.push(`mora em ${contact.lead_current_city}`);
  if (contact.preferred_contact_channel) parts.push(`contato por ${contact.preferred_contact_channel.toLowerCase()}`);
  if (contact.preferred_contact_period) parts.push(`período: ${contact.preferred_contact_period.toLowerCase()}`);
  return `${parts.join("; ")}.`;
}

export function buildNextStep(interest: string, answers: RadarAnswers, priority: string): string {
  const timeline = firstFilled(answers, TIMELINE_FIELDS).toLowerCase();
  const budget = firstFilled(answers, BUDGET_FIELDS);
  const urgent = SHORT_TERM.includes(timeline);

  switch (interest) {
    case "buy_to_live":
    case "move_to_house":
    case "new_development":
    case "buy_land":
      return urgent ? "Contato imediato com seleção de imóveis compatíveis." : "Enviar curadoria de imóveis e acompanhar o amadurecimento da decisão.";
    case "rent_property":
      return urgent ? "Enviar opções de locação disponíveis e agendar visitas." : "Cadastrar alerta de locação e manter contato periódico.";
    case "real_estate_investment":
      return budget ? "Encaminhar análise de oportunidades de investimento com rentabilidade estimada." : "Realizar diagnóstico de perfil de investimento antes de indicar ativos.";
    case "change_location":
      return "Enviar comparativo de regiões e condomínios conforme prioridades informadas.";
    case "specific_opportunity":
      return "Cadastrar alerta específico e acionar assim que houver oportunidade compatível.";
    case "sell_property":
      return val(answers, "expected_sale_price") ? "Validar o preço com análise mercadológica e propor plano de venda." : "Recomendar avaliação mercadológica do imóvel.";
    case "list_for_rent":
      return "Agendar visita para captação e definir estratégia de locação.";
    case "idle_property":
      return "Solicitar avaliação do imóvel e apresentar cenários de venda, locação ou reposicionamento.";
    default:
      return priority === "high" ? "Contato consultivo imediato para direcionar a decisão." : "Enviar conteúdo de orientação e agendar conversa diagnóstica.";
  }
}
