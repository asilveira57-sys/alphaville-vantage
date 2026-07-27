// Configuração central do Radar S.A. Imóveis (perguntas + jornadas adaptativas).
// Alterar aqui altera o fluxo inteiro — não duplicar lógica nos componentes.

export type RadarQuestionType = "single" | "multi" | "text" | "currency";

export type RadarQuestion = {
  id: string; // campo correspondente em answers_json
  label: string;
  help?: string;
  type: RadarQuestionType;
  options?: string[];
  required?: boolean;
  /** Regra de exibição opcional baseada nas respostas já dadas. */
  showIf?: (answers: RadarAnswers) => boolean;
  placeholder?: string;
  allowNote?: boolean;
};

export type RadarAnswers = Record<string, string | string[] | undefined>;

export type RadarInterest = {
  value: string;
  title: string;
  description: string;
};

export const RADAR_FORM_VERSION = "radar_v1";

export const RADAR_INTERESTS: RadarInterest[] = [
  { value: "buy_to_live", title: "Comprar para morar", description: "Encontre imóveis compatíveis com sua rotina, sua família e seu estilo de vida." },
  { value: "rent_property", title: "Alugar um imóvel", description: "Receba opções de locação alinhadas à sua região, necessidade e orçamento mensal." },
  { value: "real_estate_investment", title: "Investir em imóveis", description: "Encontre oportunidades com foco em renda, valorização, liquidez ou proteção patrimonial." },
  { value: "new_development", title: "Comprar na planta", description: "Acompanhe lançamentos e empreendimentos alinhados ao seu planejamento." },
  { value: "buy_land", title: "Comprar um terreno", description: "Encontre terrenos para construir, investir ou desenvolver um projeto." },
  { value: "move_to_house", title: "Sair do apartamento e ir para uma casa", description: "Encontre casas com mais espaço, privacidade e estrutura para sua nova fase." },
  { value: "change_location", title: "Mudar de região ou condomínio", description: "Compare regiões e condomínios de acordo com sua rotina e suas prioridades." },
  { value: "specific_opportunity", title: "Encontrar uma oportunidade específica", description: "Ative um alerta para um imóvel, condição comercial ou localização específica." },
  { value: "sell_property", title: "Vender meu imóvel", description: "Receba uma análise inicial para posicionar seu imóvel e encontrar compradores." },
  { value: "list_for_rent", title: "Alugar meu imóvel", description: "Cadastre seu imóvel para locação e receba apoio na definição da melhor estratégia." },
  { value: "idle_property", title: "Tenho um imóvel parado", description: "Avalie caminhos para vender, alugar, reformar ou reposicionar seu imóvel." },
  { value: "guided_discovery", title: "Ainda não sei qual é a melhor opção", description: "Responda algumas perguntas e receba uma orientação inicial." },
];

const REGIONS = ["Alphaville", "Tamboré", "Barueri", "Santana de Parnaíba", "Aldeia da Serra", "Outra região"];
const BEDROOMS = ["1 dormitório", "2 dormitórios", "3 dormitórios", "4 dormitórios", "5 ou mais dormitórios"];
const PURCHASE_BUDGET = [
  "Até R$ 800 mil",
  "De R$ 800 mil a R$ 1,5 milhão",
  "De R$ 1,5 milhão a R$ 3 milhões",
  "De R$ 3 milhões a R$ 5 milhões",
  "Acima de R$ 5 milhões",
  "Ainda não defini",
];
const RENT_BUDGET = [
  "Até R$ 4 mil",
  "De R$ 4 mil a R$ 7 mil",
  "De R$ 7 mil a R$ 12 mil",
  "De R$ 12 mil a R$ 20 mil",
  "Acima de R$ 20 mil",
];
const TIMELINE = ["Imediatamente", "Em até 3 meses", "De 3 a 6 meses", "De 6 a 12 meses", "Sem prazo definido"];

export const RADAR_JOURNEYS: Record<string, RadarQuestion[]> = {
  buy_to_live: [
    { id: "property_type", label: "Qual tipo de imóvel você procura?", type: "single", required: true, options: ["Casa em condomínio", "Apartamento", "Casa fora de condomínio", "Terreno para construir", "Ainda estou avaliando"] },
    { id: "preferred_regions", label: "Em quais regiões você pretende morar?", type: "multi", required: true, options: REGIONS },
    { id: "household_profile", label: "Quem vai morar no imóvel?", type: "single", options: ["Somente uma pessoa", "Casal", "Família com filhos", "Família com pets", "Família maior ou multigeracional"] },
    { id: "bedrooms", label: "Quantos dormitórios são necessários?", type: "single", options: BEDROOMS },
    { id: "must_have_features", label: "Quais características são indispensáveis?", type: "multi", options: ["Suíte", "Escritório", "Área de lazer", "Piscina", "Quintal", "Condomínio com segurança", "Proximidade de escola", "Imóvel mobiliado", "Aceita pets"] },
    { id: "purchase_budget", label: "Qual faixa de valor você pretende investir?", type: "single", required: true, options: PURCHASE_BUDGET },
    { id: "payment_method", label: "Como pretende realizar a compra?", type: "single", options: ["Pagamento à vista", "Financiamento", "Parte à vista e parte financiada", "Consórcio", "Venda de outro imóvel", "Ainda estou avaliando"] },
    { id: "move_timeline", label: "Quando pretende se mudar?", type: "single", required: true, options: TIMELINE },
  ],
  rent_property: [
    { id: "rental_property_type", label: "Qual tipo de imóvel você pretende alugar?", type: "single", required: true, options: ["Casa em condomínio", "Apartamento", "Casa fora de condomínio", "Imóvel mobiliado", "Ainda estou avaliando"] },
    { id: "rental_regions", label: "Em quais regiões você aceita morar?", type: "multi", required: true, options: REGIONS },
    { id: "monthly_housing_budget", label: "Qual valor mensal pretende destinar à locação?", help: "Considere aluguel, condomínio e IPTU.", type: "single", required: true, options: RENT_BUDGET },
    { id: "rental_bedrooms", label: "Quantos dormitórios são necessários?", type: "single", options: BEDROOMS },
    { id: "rental_requirements", label: "Quais itens precisam estar presentes no imóvel?", type: "multi", options: ["Mobiliado", "Aceita pets", "Escritório", "Piscina", "Quintal", "Próximo de escola", "Condomínio com lazer", "Vagas adicionais"] },
    { id: "rental_start_date", label: "Quando pretende iniciar a locação?", type: "single", required: true, options: ["O quanto antes", "Nos próximos 30 dias", "De 1 a 3 meses", "Depois de 3 meses", "Ainda não defini"] },
    { id: "rental_guarantee", label: "Qual tipo de garantia locatícia pretende utilizar?", type: "single", options: ["Seguro-fiança", "Fiador", "Caução", "Título de capitalização", "Preciso de orientação"] },
  ],
  real_estate_investment: [
    { id: "investment_goal", label: "Qual é seu principal objetivo com o investimento?", type: "single", required: true, options: ["Receber renda de aluguel", "Buscar valorização", "Proteger patrimônio", "Comprar para revender", "Diversificar investimentos", "Ainda estou avaliando"] },
    { id: "investment_asset_type", label: "Qual tipo de oportunidade mais combina com sua estratégia?", type: "single", options: ["Imóvel pronto para locação", "Apartamento na planta", "Terreno", "Imóvel abaixo do valor de mercado", "Imóvel para reforma e revenda", "Imóvel comercial", "Não tenho preferência"] },
    { id: "investment_capital", label: "Qual valor pretende investir?", type: "single", required: true, options: ["Até R$ 500 mil", "De R$ 500 mil a R$ 1 milhão", "De R$ 1 milhão a R$ 2 milhões", "De R$ 2 milhões a R$ 5 milhões", "Acima de R$ 5 milhões"] },
    { id: "investment_horizon", label: "Qual prazo você considera para o investimento?", type: "single", options: ["Até 2 anos", "De 2 a 5 anos", "De 5 a 10 anos", "Mais de 10 anos", "Sem prazo definido"] },
    { id: "risk_profile", label: "Qual nível de risco aceita assumir?", type: "single", options: ["Baixo, com prioridade para estabilidade", "Moderado, aceitando alguma variação", "Alto, priorizando potencial de retorno", "Preciso de orientação"] },
    { id: "liquidity_preference", label: "Qual nível de liquidez você espera?", type: "single", options: ["Quero facilidade para vender", "Posso esperar alguns anos", "Não tenho necessidade de venda rápida", "Ainda não defini"] },
    { id: "investment_payment_method", label: "Como pretende realizar o investimento?", type: "single", options: ["Recursos próprios", "Financiamento", "Consórcio", "Venda de outro ativo", "Com outros investidores"] },
    { id: "investment_regions", label: "Em quais regiões pretende investir?", type: "multi", required: true, options: ["Alphaville", "Tamboré", "Barueri", "Santana de Parnaíba", "Aldeia da Serra", "Aceito avaliar outras regiões"] },
  ],
  new_development: [
    { id: "new_development_goal", label: "Qual é a finalidade da compra?", type: "single", required: true, options: ["Moradia", "Investimento", "Renda futura", "Compra para filhos ou familiares", "Ainda estou avaliando"] },
    { id: "development_type", label: "Qual tipo de empreendimento procura?", type: "single", options: ["Apartamento", "Studio", "Casa em condomínio", "Imóvel comercial", "Não tenho preferência"] },
    { id: "available_down_payment", label: "Qual valor consegue destinar à entrada?", type: "single", required: true, options: ["Até R$ 50 mil", "De R$ 50 mil a R$ 150 mil", "De R$ 150 mil a R$ 300 mil", "Acima de R$ 300 mil", "Depende das condições"] },
    { id: "monthly_construction_payment", label: "Qual valor mensal consegue destinar durante a obra?", type: "single", options: ["Até R$ 3 mil", "De R$ 3 mil a R$ 6 mil", "De R$ 6 mil a R$ 10 mil", "Acima de R$ 10 mil", "Preciso analisar"] },
    { id: "delivery_timeline", label: "Qual prazo de entrega atende seu planejamento?", type: "single", options: ["Até 1 ano", "De 1 a 2 anos", "De 2 a 3 anos", "Acima de 3 anos", "Não tenho preferência"] },
    { id: "development_regions", label: "Quais regiões devem entrar na pesquisa?", type: "multi", required: true, options: REGIONS },
  ],
  buy_land: [
    { id: "land_goal", label: "Qual é a finalidade do terreno?", type: "single", required: true, options: ["Construir para morar", "Construir para vender", "Investir em valorização", "Desenvolver um empreendimento", "Ainda estou avaliando"] },
    { id: "land_type", label: "Qual tipo de terreno procura?", type: "single", options: ["Terreno em condomínio", "Terreno fora de condomínio", "Área maior para empreendimento", "Terreno comercial", "Não tenho preferência"] },
    { id: "land_size", label: "Qual metragem aproximada atende seu projeto?", type: "single", options: ["Até 300 m²", "De 300 m² a 500 m²", "De 500 m² a 1.000 m²", "Acima de 1.000 m²", "Ainda não defini"] },
    { id: "land_budget", label: "Qual faixa de valor pretende investir?", type: "single", required: true, options: ["Até R$ 500 mil", "De R$ 500 mil a R$ 1 milhão", "De R$ 1 milhão a R$ 2 milhões", "Acima de R$ 2 milhões"] },
    { id: "land_features", label: "Quais características do terreno são importantes?", type: "multi", options: ["Terreno plano", "Vista permanente", "Fundo para área verde", "Esquina", "Próximo à portaria", "Maior privacidade", "Boa posição solar"] },
    { id: "land_purchase_timeline", label: "Quando pretende realizar a compra?", type: "single", required: true, options: ["Imediatamente", "Em até 3 meses", "De 3 a 6 meses", "Depois de 6 meses"] },
  ],
  move_to_house: [
    { id: "house_move_reason", label: "Qual é o principal motivo da mudança?", type: "multi", required: true, options: ["Mais espaço", "Mais privacidade", "Quintal para crianças", "Espaço para pets", "Segurança", "Home office", "Mudança no estilo de vida"] },
    { id: "current_property_dependency", label: "Seu apartamento atual precisa ser vendido ou alugado?", type: "single", required: true, options: ["Preciso vender antes", "Preciso alugar antes", "Posso comprar sem vender", "Não tenho imóvel atual"] },
    { id: "desired_house_type", label: "Qual tipo de casa procura?", type: "single", options: ["Casa em condomínio", "Casa fora de condomínio", "Casa pronta", "Casa para reformar", "Casa nova"] },
    { id: "house_purchase_budget", label: "Qual faixa de valor pretende investir?", type: "single", required: true, options: PURCHASE_BUDGET },
    { id: "house_essential_spaces", label: "Quais espaços são essenciais?", type: "multi", options: ["Quintal", "Piscina", "Escritório", "Espaço gourmet", "Quarto no térreo", "Área para pets", "Três ou mais vagas"] },
    { id: "house_move_timeline", label: "Em quanto tempo pretende fazer a mudança?", type: "single", required: true, options: TIMELINE },
  ],
  change_location: [
    { id: "current_region", label: "Onde você mora atualmente?", type: "single", required: true, options: ["Alphaville", "Tamboré", "Barueri", "Santana de Parnaíba", "São Paulo", "Outra região"] },
    { id: "relocation_reason", label: "Qual é o principal motivo da mudança?", type: "single", options: ["Escola", "Trabalho", "Segurança", "Trânsito", "Mais espaço", "Redução de custos", "Mudança de estilo de vida"] },
    { id: "important_locations", label: "Quais pontos precisam ficar próximos?", type: "multi", options: ["Escola", "Trabalho", "Comércio", "Rodovia Castelo Branco", "Transporte", "Serviços de saúde", "Família"] },
    { id: "acceptable_commute", label: "Quanto tempo de deslocamento você aceita?", type: "single", options: ["Até 15 minutos", "Até 30 minutos", "Até 45 minutos", "Até 1 hora", "O deslocamento não é prioridade"] },
    { id: "relocation_transaction_type", label: "Pretende comprar ou alugar?", type: "single", required: true, options: ["Comprar", "Alugar", "Avaliar as duas possibilidades"] },
    {
      id: "relocation_budget",
      label: "Qual faixa de valor de compra atende seu planejamento?",
      type: "single",
      required: true,
      options: PURCHASE_BUDGET,
      showIf: (a) => a.relocation_transaction_type === "Comprar" || a.relocation_transaction_type === "Avaliar as duas possibilidades",
    },
    {
      id: "relocation_rent_budget",
      label: "Qual faixa de valor mensal de locação atende seu planejamento?",
      type: "single",
      required: true,
      options: RENT_BUDGET,
      showIf: (a) => a.relocation_transaction_type === "Alugar" || a.relocation_transaction_type === "Avaliar as duas possibilidades",
    },
  ],
  specific_opportunity: [
    { id: "opportunity_type", label: "Qual oportunidade você procura?", type: "single", required: true, options: ["Imóvel abaixo do valor de mercado", "Venda urgente", "Casa em condomínio específico", "Imóvel com renda", "Terreno com condição especial", "Lançamento com condição diferenciada", "Outro perfil"] },
    { id: "target_location", label: "Em qual região ou condomínio?", type: "text", required: true, placeholder: "Ex.: Alphaville Residencial 10, Tamboré 4..." },
    { id: "maximum_opportunity_value", label: "Qual é o valor máximo da oportunidade?", type: "currency", placeholder: "R$ 0,00" },
    { id: "mandatory_opportunity_features", label: "Quais características são obrigatórias?", type: "multi", allowNote: true, options: ["Suíte", "Piscina", "Quintal", "Escritório", "Área de lazer", "Vista permanente", "Aceita pets", "Mobiliado", "Três ou mais vagas"] },
    { id: "opportunity_urgency", label: "Qual nível de urgência da pesquisa?", type: "single", required: true, options: ["Estou pronto para fechar", "Pretendo fechar em até 3 meses", "Estou monitorando oportunidades", "Ainda estou estudando"] },
  ],
  sell_property: [
    { id: "seller_property_type", label: "Qual tipo de imóvel pretende vender?", type: "single", required: true, options: ["Casa em condomínio", "Apartamento", "Casa fora de condomínio", "Terreno", "Imóvel comercial"] },
    { id: "seller_property_location", label: "Onde o imóvel está localizado?", help: "Informe condomínio, bairro e cidade. Endereço é opcional.", type: "text", required: true, placeholder: "Ex.: Alphaville Residencial 3, Barueri" },
    { id: "property_occupancy_status", label: "Qual é a situação atual do imóvel?", type: "single", required: true, options: ["Ocupado pelo proprietário", "Alugado", "Vazio", "Em reforma", "Em construção"] },
    { id: "listing_status", label: "O imóvel já está anunciado?", type: "single", options: ["Ainda não", "Há menos de 3 meses", "De 3 a 6 meses", "Há mais de 6 meses", "Está anunciado com outra imobiliária"] },
    { id: "expected_sale_price", label: "Qual valor pretende receber pelo imóvel?", type: "currency", placeholder: "R$ 0,00" },
    { id: "price_definition_source", label: "Como chegou a esse valor?", type: "single", options: ["Avaliação profissional", "Comparação com outros anúncios", "Valor definido por conta própria", "Valor sugerido por outra imobiliária", "Ainda não defini"] },
    { id: "sale_reason", label: "Qual é o principal motivo da venda?", type: "single", options: ["Mudança de imóvel", "Mudança de cidade", "Investimento", "Necessidade de liquidez", "Imóvel parado", "Organização patrimonial", "Outro motivo"] },
    { id: "sale_timeline", label: "Em quanto tempo pretende vender?", type: "single", required: true, options: ["O quanto antes", "Em até 3 meses", "De 3 a 6 meses", "Sem urgência"] },
  ],
  list_for_rent: [
    { id: "landlord_property_type", label: "Qual tipo de imóvel pretende disponibilizar?", type: "single", required: true, options: ["Casa em condomínio", "Apartamento", "Casa fora de condomínio", "Imóvel comercial", "Outro tipo"] },
    { id: "landlord_property_location", label: "Onde o imóvel está localizado?", type: "text", required: true, placeholder: "Ex.: Tamboré 2, Santana de Parnaíba" },
    { id: "rental_availability_status", label: "Qual é a situação atual do imóvel?", type: "single", required: true, options: ["Vazio", "Ocupado pelo proprietário", "Com inquilino", "Em reforma", "Ficará disponível em breve"] },
    { id: "expected_monthly_rent", label: "Qual valor mensal pretende receber?", type: "currency", placeholder: "R$ 0,00" },
    { id: "furnishing_status", label: "O imóvel está mobiliado?", type: "single", options: ["Totalmente mobiliado", "Parcialmente mobiliado", "Sem mobília"] },
    { id: "property_available_date", label: "Quando o imóvel ficará disponível?", type: "single", required: true, options: ["Imediatamente", "Em até 30 dias", "De 1 a 3 meses", "Depois de 3 meses"] },
    { id: "rental_listing_status", label: "O imóvel já está anunciado?", type: "single", options: ["Ainda não", "Está anunciado sem resultado", "Está com outra imobiliária", "Já possui interessados", "Preciso substituir o inquilino atual"] },
  ],
  idle_property: [
    { id: "idle_duration", label: "Há quanto tempo o imóvel está parado?", type: "single", required: true, options: ["Menos de 3 meses", "De 3 a 6 meses", "De 6 a 12 meses", "Há mais de 1 ano"] },
    { id: "idle_property_status", label: "Qual é a situação atual do imóvel?", type: "single", required: true, options: ["Vazio", "Em reforma", "Anunciado para venda", "Anunciado para locação", "Com documentação pendente", "Sem estratégia definida"] },
    { id: "idle_property_goal", label: "Qual resultado você busca?", type: "single", required: true, options: ["Vender", "Alugar", "Reformar e valorizar", "Avaliar as possibilidades", "Reduzir os custos mensais"] },
    { id: "idle_property_obstacle", label: "Qual é o principal obstáculo atualmente?", type: "single", options: ["Falta de interessados", "Valor inadequado", "Estado de conservação", "Documentação", "Divulgação ruim", "Não sei identificar"] },
    { id: "idle_monthly_cost", label: "Qual custo mensal esse imóvel gera?", type: "single", options: ["Até R$ 1 mil", "De R$ 1 mil a R$ 3 mil", "De R$ 3 mil a R$ 5 mil", "Acima de R$ 5 mil", "Não sei informar"] },
  ],
  guided_discovery: [
    { id: "current_real_estate_moment", label: "Qual situação mais se aproxima do seu momento?", type: "single", required: true, options: ["Preciso mudar de imóvel", "Quero investir", "Tenho um imóvel e não sei o que fazer", "Estou apenas pesquisando", "Quero entender meu poder de compra"] },
    { id: "desired_outcome", label: "Qual resultado seria mais importante agora?", type: "single", required: true, options: ["Encontrar um imóvel", "Gerar renda", "Preservar patrimônio", "Vender um imóvel", "Reduzir custos", "Receber orientação"] },
    { id: "decision_value_range", label: "Qual valor está envolvido nessa decisão?", type: "single", options: ["Até R$ 500 mil", "De R$ 500 mil a R$ 1 milhão", "De R$ 1 milhão a R$ 3 milhões", "Acima de R$ 3 milhões", "Ainda não sei"] },
    { id: "decision_timeline", label: "Em qual prazo pretende tomar uma decisão?", type: "single", required: true, options: ["Imediatamente", "Em até 3 meses", "De 3 a 6 meses", "Depois de 6 meses", "Sem prazo definido"] },
  ],
};

export const CONTACT_CHANNELS = ["WhatsApp", "Telefone", "E-mail"];
export const CONTACT_PERIODS = ["Manhã", "Horário do almoço", "Tarde", "Noite", "Qualquer horário comercial"];

export const RADAR_STATUSES = [
  { value: "radar_recebido", label: "Radar recebido" },
  { value: "aguardando_analise", label: "Aguardando análise" },
  { value: "contato_iniciado", label: "Contato iniciado" },
  { value: "perfil_validado", label: "Perfil validado" },
  { value: "oportunidades_enviadas", label: "Oportunidades enviadas" },
  { value: "visita_agendada", label: "Visita agendada" },
  { value: "negociacao", label: "Negociação" },
  { value: "concluido", label: "Concluído" },
  { value: "sem_avanco", label: "Sem avanço" },
];

export function getJourney(interest: string): RadarQuestion[] {
  return RADAR_JOURNEYS[interest] ?? [];
}

export function visibleQuestions(interest: string, answers: RadarAnswers): RadarQuestion[] {
  return getJourney(interest).filter((q) => !q.showIf || q.showIf(answers));
}

export function interestLabel(value: string): string {
  return RADAR_INTERESTS.find((i) => i.value === value)?.title ?? value;
}
