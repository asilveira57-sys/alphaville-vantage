// Conteúdo das páginas de captação de proprietários (venda e locação).
export type OwnerFaq = { q: string; a: string };
export type OwnerPage = {
  path: "/vender-meu-imovel" | "/alugar-meu-imovel";
  interest: "sell_property" | "list_for_rent";
  context: "captacao_venda" | "captacao_locacao";
  finalidade: string;
  label: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  lead: string;
  steps: { title: string; text: string }[];
  faq: OwnerFaq[];
};

export const OWNER_BROKERS = ["João Carvalho", "Gustavo Padilha"];

export const OWNER_HUB = {
  title: "Anuncie seu imóvel em Alphaville — S.A Imóveis",
  description:
    "Quer vender ou alugar seu imóvel em Alphaville, Tamboré, Barueri ou Santana de Parnaíba? Avaliação, fotos e divulgação no portal com a S.A Imóveis.",
  h1: "Anuncie seu imóvel em Alphaville com a S.A Imóveis",
  lead: "Escolha o caminho: vender ou alugar. Em poucos minutos você nos conta sobre o imóvel e um dos nossos corretores retorna no horário que preferir.",
};

export const OWNER_OFFER = [
  { title: "Avaliação de mercado", text: "Preço definido com base em negócios e anúncios reais do mesmo condomínio e da região." },
  { title: "Fotos profissionais", text: "Produção de fotos que valorizam o imóvel e geram mais visitas qualificadas." },
  { title: "Divulgação no portal e no site", text: "Anúncio no portal S.A Imóveis Alphaville e no site oficial da imobiliária, além da nossa carteira de clientes." },
  { title: "Corretores dedicados", text: `Atendimento direto com ${OWNER_BROKERS.join(" e ")}, que conhecem cada condomínio da região.` },
];

export const OWNER_PAGES: OwnerPage[] = [
  {
    path: "/vender-meu-imovel",
    interest: "sell_property",
    context: "captacao_venda",
    finalidade: "Venda",
    label: "Vender meu imóvel",
    title: "Venda seu imóvel em Alphaville — S.A Imóveis",
    description:
      "Venda sua casa ou apartamento em Alphaville, Tamboré e Santana de Parnaíba com avaliação de mercado, fotos profissionais e divulgação no portal da S.A Imóveis.",
    eyebrow: "Para proprietários · Venda",
    h1: "Venda seu imóvel em Alphaville com a S.A Imóveis",
    lead: "Avaliação realista, anúncio bem produzido e corretores que conhecem cada condomínio. Conte sobre o imóvel e retornamos no horário que você escolher.",
    steps: [
      { title: "Você nos conta sobre o imóvel", text: "Preencha o formulário curto desta página com tipo, localização e situação." },
      { title: "Avaliação de mercado", text: "Analisamos o imóvel e o condomínio e sugerimos um preço competitivo." },
      { title: "Fotos e anúncio", text: "Produzimos as fotos e publicamos no portal e no site oficial." },
      { title: "Visitas e negociação", text: "Filtramos os interessados, acompanhamos as visitas e conduzimos a negociação até a escritura." },
    ],
    faq: [
      { q: "Quanto custa anunciar meu imóvel para venda?", a: "A avaliação e o cadastro não têm custo. A comissão só é cobrada quando a venda é concluída." },
      { q: "Como vocês definem o preço de venda?", a: "Comparamos negócios e anúncios do mesmo condomínio e da região, considerando metragem, estado de conservação e momento do mercado." },
      { q: "Posso vender um imóvel que está alugado ou ocupado?", a: "Sim. Informe a situação no formulário e combinamos as visitas respeitando quem está no imóvel." },
      { q: "Em quais regiões vocês atuam?", a: "Alphaville, Tamboré, Barueri, Santana de Parnaíba e arredores." },
      { q: "Quem vai me atender?", a: `Os corretores ${OWNER_BROKERS.join(" e ")}, da equipe da S.A Imóveis.` },
    ],
  },
  {
    path: "/alugar-meu-imovel",
    interest: "list_for_rent",
    context: "captacao_locacao",
    finalidade: "Locação",
    label: "Alugar meu imóvel",
    title: "Alugue seu imóvel em Alphaville — S.A Imóveis",
    description:
      "Alugue sua casa ou apartamento em Alphaville, Tamboré e Barueri com avaliação de aluguel, fotos profissionais, análise de inquilinos e divulgação no portal da S.A Imóveis.",
    eyebrow: "Para proprietários · Locação",
    h1: "Alugue seu imóvel em Alphaville com a S.A Imóveis",
    lead: "Valor de aluguel certo, inquilino bem analisado e contrato seguro. Conte sobre o imóvel e retornamos no horário que você escolher.",
    steps: [
      { title: "Você nos conta sobre o imóvel", text: "Preencha o formulário curto desta página com tipo, localização e situação." },
      { title: "Avaliação do aluguel", text: "Sugerimos o valor mensal com base em locações do mesmo condomínio e da região." },
      { title: "Fotos e anúncio", text: "Produzimos as fotos e publicamos no portal e no site oficial." },
      { title: "Inquilino e contrato", text: "Fazemos a análise cadastral, definimos a garantia e cuidamos do contrato e da vistoria." },
    ],
    faq: [
      { q: "Quanto custa anunciar meu imóvel para locação?", a: "A avaliação e o cadastro não têm custo. Os honorários são combinados com você antes do anúncio." },
      { q: "Como é feita a análise do inquilino?", a: "Verificamos documentos, renda e histórico, e trabalhamos com garantias como seguro-fiança, caução ou título de capitalização." },
      { q: "Vocês administram o aluguel depois?", a: "Sim. A S.A Imóveis também faz administração de locação: cobrança, repasse, manutenções e renovação." },
      { q: "O imóvel precisa estar vazio para anunciar?", a: "Não. Informe a situação no formulário e combinamos as visitas." },
      { q: "Quem vai me atender?", a: `Os corretores ${OWNER_BROKERS.join(" e ")}, da equipe da S.A Imóveis.` },
    ],
  },
];

export const ownerPage = (path: OwnerPage["path"]) => OWNER_PAGES.find((p) => p.path === path)!;
