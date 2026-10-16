// Textos padrão dos e-mails do site. O Admin (E-mails) pode sobrescrever cada campo.
// Variáveis disponíveis nos textos: {nome}, {origem}, {pagina}, {resumo}, {email}, {telefone}.

export const LEAD_INBOX = "contato@saimoveisalpha.com.br";

export type EmailTexts = {
  subject: string;
  heading: string;
  intro: string;
  outro: string;
  cta_label: string;
  cta_url: string;
};

export type EmailTemplateDef = EmailTexts & {
  name: string;
  label: string;
  audience: "interno" | "cliente";
  /** Origem do lead (leads.source) que dispara a confirmação ao cliente. */
  sources: string[];
};

export const EMAIL_TEMPLATES: EmailTemplateDef[] = [
  {
    name: "lead-notificacao",
    label: "Aviso interno: lead novo",
    audience: "interno",
    sources: [],
    subject: "Novo lead — {origem}: {nome}",
    heading: "Novo lead: {origem}",
    intro: "Um novo contato foi cadastrado no site.",
    outro: "Marque como Atendido no painel depois do contato.",
    cta_label: "Abrir Leads (CRM)",
    cta_url: "https://portal.saimoveisalpha.com.br/admin-leads",
  },
  {
    name: "newsletter-confirmacao",
    label: "Newsletter — confirmação",
    audience: "cliente",
    sources: ["newsletter"],
    subject: "Inscrição confirmada — S.A Imóveis Alphaville",
    heading: "Bem-vindo à nossa newsletter",
    intro: "Sua inscrição foi confirmada. Você vai receber nossas análises do mercado de Alphaville, Tamboré e região.",
    outro: "Se precisar de ajuda para encontrar um imóvel, fale com a nossa equipe.",
    cta_label: "Ver imóveis",
    cta_url: "https://portal.saimoveisalpha.com.br/imoveis",
  },
  {
    name: "financiamento-resumo",
    label: "Financiamento — resumo da simulação",
    audience: "cliente",
    sources: ["financiamento"],
    subject: "Sua simulação de financiamento — S.A Imóveis",
    heading: "Olá, {nome}. Aqui está sua simulação",
    intro: "Guardamos os números da simulação que você fez no nosso site:",
    outro: "Os valores são estimativas e dependem da aprovação do banco. Um consultor pode ajudar você a comparar as opções.",
    cta_label: "Falar no WhatsApp",
    cta_url: "https://wa.me/5511995515053",
  },
  {
    name: "radar-confirmacao",
    label: "Radar — confirmação",
    audience: "cliente",
    sources: ["radar"],
    subject: "Seu Radar S.A está ativo",
    heading: "{nome}, seu radar está ativo",
    intro: "Recebemos o seu perfil. Nossa equipe vai procurar os imóveis certos para o seu momento.",
    outro: "Um corretor vai entrar em contato em breve.",
    cta_label: "Falar no WhatsApp",
    cta_url: "https://wa.me/5511995515053",
  },
  {
    name: "pesquisa-salva",
    label: "Pesquisa salva — lista de imóveis",
    audience: "cliente",
    sources: ["pesquisa"],
    subject: "Sua pesquisa salva — S.A Imóveis Alphaville",
    heading: "{nome}, aqui está sua seleção",
    intro: "Estes são os imóveis da pesquisa que você salvou:",
    outro: "Quer ajuda para visitar algum deles? Fale com a nossa equipe.",
    cta_label: "Ver a pesquisa completa",
    cta_url: "{pagina}",
  },
  {
    name: "oportunidades-confirmacao",
    label: "Lista de Oportunidades — confirmação",
    audience: "cliente",
    sources: ["oportunidades"],
    subject: "Você está na Lista de Oportunidades",
    heading: "Inscrição confirmada, {nome}",
    intro: "Você vai receber as oportunidades selecionadas pela S.A Imóveis Alphaville.",
    outro: "Fique à vontade para nos chamar no WhatsApp.",
    cta_label: "Ver oportunidades",
    cta_url: "https://portal.saimoveisalpha.com.br/oportunidades",
  },
  {
    name: "parceiro-confirmacao",
    label: "Empreendimento/Parceiro — confirmação",
    audience: "cliente",
    sources: ["parceiro", "empreendimento"],
    subject: "Recebemos seu interesse — S.A Imóveis",
    heading: "Obrigado, {nome}",
    intro: "Recebemos o seu interesse: {resumo}.",
    outro: "Um consultor vai falar com você em breve.",
    cta_label: "Falar no WhatsApp",
    cta_url: "https://wa.me/5511995515053",
  },
];

export const TEMPLATE_BY_NAME = Object.fromEntries(EMAIL_TEMPLATES.map((t) => [t.name, t]));

export function fillVars(text: string, vars: Record<string, string | null | undefined>) {
  return text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? "").toString());
}
