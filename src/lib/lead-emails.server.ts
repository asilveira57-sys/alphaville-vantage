// Server-only: envia o aviso interno e a confirmação ao cliente de cada lead.
import { EMAIL_TEMPLATES, LEAD_INBOX, TEMPLATE_BY_NAME, fillVars, type EmailTexts } from "./email-defaults";
import type { BrandEmailProps } from "./email-templates/brand-email";
import { SITE_URL } from "./site";

type Admin = any;

const brl = (n: unknown) =>
  Number(n) ? Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "";

export async function loadTemplateTexts(admin: Admin, name: string) {
  const def = TEMPLATE_BY_NAME[name];
  const { data } = await admin.from("email_template_settings").select("*").eq("template_name", name).maybeSingle();
  const pick = (k: keyof EmailTexts) => (data?.[k] && String(data[k]).trim() ? String(data[k]) : def[k]);
  return {
    enabled: data ? data.enabled !== false : true,
    recipient: (data?.recipient_override && String(data.recipient_override).trim()) || LEAD_INBOX,
    texts: {
      subject: pick("subject"), heading: pick("heading"), intro: pick("intro"),
      outro: pick("outro"), cta_label: pick("cta_label"), cta_url: pick("cta_url"),
    } as EmailTexts,
  };
}

export function buildProps(texts: EmailTexts, vars: Record<string, string>, extra: Partial<BrandEmailProps> = {}): BrandEmailProps {
  const f = (s: string) => fillVars(s, vars);
  const url = f(texts.cta_url);
  return {
    subject: f(texts.subject), heading: f(texts.heading), intro: f(texts.intro), outro: f(texts.outro),
    ctaLabel: f(texts.cta_label), ctaUrl: /^https?:\/\//.test(url) ? url : SITE_URL, ...extra,
  };
}

async function sendLogged(admin: Admin, name: string, to: string, props: BrandEmailProps, key: string, leadId: string | null) {
  const { sendTemplateEmail } = await import("./email-templates/send-email");
  try {
    const r = await sendTemplateEmail(name, to, { templateData: props, idempotencyKey: key, replyTo: LEAD_INBOX });
    await admin.from("email_dispatch_log").insert({ template_name: name, recipient: to, lead_id: leadId, status: r.sent ? "enviado" : "bloqueado" });
    return r;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email]", name, msg);
    await admin.from("email_dispatch_log").insert({ template_name: name, recipient: to, lead_id: leadId, status: "falhou", error: msg.slice(0, 500) });
    return { sent: false as const, reason: "error" };
  }
}

async function clientExtras(admin: Admin, lead: any): Promise<Partial<BrandEmailProps>> {
  const p = lead.payload ?? {};
  if (lead.source === "financiamento") {
    return {
      details: [
        { label: "Valor do imóvel", value: brl(p.property_value) },
        { label: "Entrada", value: brl(p.down_payment) },
        { label: "Valor financiado", value: brl(p.financed_amount) },
        { label: "Prazo", value: `${p.term_months} meses` },
        { label: "Sistema", value: String(p.amortization_system ?? "").toUpperCase() },
        { label: "Taxa anual", value: `${p.annual_rate}%` },
        { label: "Primeira parcela", value: brl(p.first_installment) },
        { label: "Última parcela", value: brl(p.last_installment) },
        ...(p.bank_name ? [{ label: "Banco", value: String(p.bank_name) }] : []),
      ].filter((d) => d.value && d.value !== "undefined meses"),
    };
  }
  if (lead.source === "pesquisa") {
    const ids: string[] = (p.property_ids ?? []).slice(0, 30);
    if (!ids.length) return {};
    const { data } = await admin
      .from("properties")
      .select("id,slug,title,city,neighborhood,bedrooms,area_useful,area_built,area_total,price_sale,price_rent,card_image_url")
      .in("id", ids);
    const order = new Map(ids.map((id, i) => [id, i]));
    return {
      items: (data ?? [])
        .sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
        .map((r: any) => {
          const area = r.area_useful || r.area_built || r.area_total;
          return {
            title: r.title,
            url: `${SITE_URL}/imoveis/${r.slug}`,
            image: r.card_image_url && /^https?:/.test(r.card_image_url) ? r.card_image_url : r.card_image_url ? `${SITE_URL}${r.card_image_url}` : null,
            facts: [[r.neighborhood, r.city].filter(Boolean).join(", "), r.bedrooms ? `${r.bedrooms} dorm.` : "", area ? `${Math.round(area)} m²` : ""].filter(Boolean).join(" · "),
            price: [r.price_sale ? `Venda ${brl(r.price_sale)}` : "", r.price_rent ? `Aluguel ${brl(r.price_rent)}` : ""].filter(Boolean).join(" · "),
          };
        }),
    };
  }
  if (lead.source === "radar" && p.recommended_next_step) {
    return { details: [{ label: "Seu perfil", value: String(lead.summary ?? "") }] };
  }
  return {};
}

/** Lê o lead central (criado pelo gatilho) e envia os e-mails. Nunca lança. */
export async function dispatchLeadEmails(sourceTable: string, sourceId: string) {
  try {
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: lead } = await admin.from("leads").select("*").eq("source_table", sourceTable).eq("source_id", sourceId).maybeSingle();
    if (!lead) return;
    const vars = {
      nome: (lead.name ?? "").split(" ")[0] || "cliente",
      origem: lead.source_label, pagina: lead.landing_page ?? "", resumo: lead.summary ?? "",
      email: lead.email ?? "", telefone: lead.phone ?? "",
    };
    const stamp = new Date(lead.updated_at ?? lead.created_at).getTime();

    const internal = await loadTemplateTexts(admin, "lead-notificacao");
    if (internal.enabled) {
      const props = buildProps(internal.texts, vars, {
        details: [
          { label: "Origem", value: lead.source_label },
          { label: "Nome", value: lead.name ?? "—" },
          { label: "WhatsApp", value: lead.phone ?? "—" },
          { label: "E-mail", value: lead.email ?? "—" },
          { label: "Página", value: lead.landing_page ?? "—" },
          { label: "Resumo", value: lead.summary ?? "—" },
        ],
      });
      await sendLogged(admin, "lead-notificacao", internal.recipient, props, `lead-notificacao-${lead.id}-${stamp}`, lead.id);
    }

    const tpl = EMAIL_TEMPLATES.find((t) => t.audience === "cliente" && t.sources.includes(lead.source));
    if (tpl && lead.email) {
      const conf = await loadTemplateTexts(admin, tpl.name);
      if (conf.enabled) {
        const props = buildProps(conf.texts, vars, await clientExtras(admin, lead));
        await sendLogged(admin, tpl.name, lead.email, props, `${tpl.name}-${lead.id}-${stamp}`, lead.id);
      }
    }
  } catch (e) {
    console.error("[email] dispatch failed", e);
  }
}

export async function sendTestEmail(admin: Admin, name: string, to: string) {
  const conf = await loadTemplateTexts(admin, name);
  const vars = { nome: "Maria", origem: "Teste", pagina: SITE_URL, resumo: "Lead de teste", email: to, telefone: "(11) 99999-0000" };
  const props = buildProps(conf.texts, vars, { details: [{ label: "Exemplo", value: "Este é um envio de teste" }] });
  return sendLogged(admin, name, to, props, `teste-${name}-${Date.now()}`, null);
}
