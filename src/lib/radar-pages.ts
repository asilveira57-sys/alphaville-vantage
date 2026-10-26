// Páginas públicas do Radar: slug em português → objetivo do questionário + textos de SEO.
export type RadarFaq = { q: string; a: string };
export type RadarPage = {
  slug: string;
  interest: string;
  title: string;
  description: string;
  h1: string;
  intro: string[];
  faq: RadarFaq[];
};

export const RADAR_HUB = {
  title: "Radar S.A. Imóveis — encontre o imóvel certo em Alphaville",
  description:
    "Ative o Radar S.A. Imóveis: responda poucas perguntas e nossa equipe busca imóveis, lançamentos e oportunidades em Alphaville, Tamboré, Barueri e Santana de Parnaíba para você.",
  h1: "Ative o seu Radar e deixe a nossa equipe procurar por você",
  intro: [
    "O Radar S.A. Imóveis é um questionário rápido que traduz o seu momento — comprar, alugar, investir, vender ou simplesmente entender as opções — em uma busca ativa feita pela nossa equipe.",
    "Você conta o que importa, e nós acompanhamos o mercado de Alphaville, Tamboré, Barueri e Santana de Parnaíba para avisar quando surgir o imóvel ou a oportunidade que combina com você.",
  ],
  faq: [
    { q: "O Radar é gratuito?", a: "Sim. Ativar o Radar não tem custo nem compromisso. Você só recebe contato da nossa equipe com opções alinhadas ao que respondeu." },
    { q: "Quanto tempo leva para responder?", a: "Cerca de dois minutos. As perguntas mudam conforme o seu objetivo, então você só responde o que faz sentido para o seu caso." },
    { q: "Como recebo as opções?", a: "Pelo canal que você escolher no final: WhatsApp, telefone ou e-mail, no período que preferir." },
    { q: "Quais regiões o Radar cobre?", a: "Alphaville, Tamboré, Barueri, Santana de Parnaíba, Aldeia da Serra e arredores." },
    { q: "Meus dados ficam protegidos?", a: "Sim. Usamos seus dados apenas para o atendimento solicitado, conforme a nossa Política de Privacidade e a LGPD." },
  ] as RadarFaq[],
};

const p = (x: RadarPage) => x;

export const RADAR_PAGES: RadarPage[] = [
  p({
    slug: "comprar", interest: "buy_to_live",
    title: "Comprar imóvel para morar em Alphaville — Radar S.A. Imóveis",
    description: "Quer comprar casa ou apartamento para morar em Alphaville, Tamboré ou Santana de Parnaíba? Ative o Radar e receba opções compatíveis com sua rotina e orçamento.",
    h1: "Comprar um imóvel para morar em Alphaville",
    intro: ["Conte como é a sua rotina, quantas pessoas vão morar e quanto pretende investir. A nossa equipe cruza essas respostas com os imóveis disponíveis — inclusive os que ainda não chegaram aos portais.", "Você recebe só o que faz sentido, sem precisar filtrar centenas de anúncios."],
    faq: [
      { q: "Preciso já ter o financiamento aprovado?", a: "Não. No questionário você indica se vai usar recursos próprios, financiamento ou FGTS, e nós orientamos os próximos passos." },
      { q: "Vocês mostram imóveis fora do site?", a: "Sim. Além do nosso portfólio, acompanhamos imóveis da região que ainda não foram anunciados publicamente." },
      { q: "Posso escolher mais de um condomínio?", a: "Pode. Indique as regiões e condomínios de interesse e o Radar considera todos." },
    ],
  }),
  p({
    slug: "alugar", interest: "rent_property",
    title: "Alugar imóvel em Alphaville e Tamboré — Radar S.A. Imóveis",
    description: "Procurando casa ou apartamento para alugar em Alphaville, Tamboré ou Barueri? Ative o Radar com sua região, data de mudança e orçamento mensal.",
    h1: "Alugar um imóvel em Alphaville e região",
    intro: ["Informe a região, a data em que precisa do imóvel e o valor mensal que cabe no seu orçamento, incluindo condomínio e IPTU.", "A nossa equipe avisa assim que surgir uma locação compatível, para você sair na frente."],
    faq: [
      { q: "Quais garantias de locação são aceitas?", a: "Depende do proprietário. Em geral trabalhamos com seguro-fiança, título de capitalização, caução e fiador; você indica sua preferência no Radar." },
      { q: "Aceitam animais de estimação?", a: "Muitos imóveis aceitam. Informe no questionário e filtramos as opções." },
      { q: "Com quanta antecedência devo ativar o Radar?", a: "O ideal é entre 30 e 60 dias antes da data de mudança." },
    ],
  }),
  p({
    slug: "investir", interest: "real_estate_investment",
    title: "Investir em imóveis em Alphaville — Radar S.A. Imóveis",
    description: "Encontre imóveis para investir em Alphaville e região com foco em renda de aluguel, valorização ou liquidez. Ative o Radar e receba oportunidades selecionadas.",
    h1: "Investir em imóveis em Alphaville",
    intro: ["Diga qual é o seu foco — renda mensal, valorização, liquidez ou proteção patrimonial — e o capital disponível.", "Nossa equipe seleciona imóveis e lançamentos com números que fazem sentido para a sua estratégia."],
    faq: [
      { q: "Vocês ajudam a estimar a rentabilidade?", a: "Sim. Para cada oportunidade apresentamos referência de aluguel e preço por m² da região." },
      { q: "Lançamento ou imóvel pronto: qual é melhor?", a: "Depende do prazo e do objetivo. Imóvel pronto gera renda imediata; na planta costuma ter preço de entrada menor. O Radar considera os dois." },
      { q: "Vocês administram o imóvel depois da compra?", a: "Sim, a S.A Imóveis também faz a administração de locação." },
    ],
  }),
  p({
    slug: "lancamentos", interest: "new_development",
    title: "Lançamentos e imóveis na planta em Alphaville — Radar S.A. Imóveis",
    description: "Acompanhe lançamentos e empreendimentos na planta em Alphaville, Tamboré e Santana de Parnaíba. Ative o Radar e receba novidades alinhadas ao seu plano.",
    h1: "Lançamentos e imóveis na planta em Alphaville",
    intro: ["Conte o tipo de imóvel, a entrada disponível e quando gostaria de receber as chaves.", "Avisamos sobre lançamentos e condições especiais de incorporadoras assim que forem anunciados."],
    faq: [
      { q: "Vocês trabalham com quais incorporadoras?", a: "Com as principais incorporadoras que atuam na região, incluindo parceiras como a MPD." },
      { q: "Consigo condições de pré-lançamento?", a: "Quando a incorporadora abre pré-lançamento, quem está no Radar é avisado primeiro." },
      { q: "Como funciona o pagamento na planta?", a: "Normalmente há uma entrada, parcelas durante a obra e o saldo financiado na entrega das chaves." },
    ],
  }),
  p({
    slug: "terrenos", interest: "buy_land",
    title: "Terrenos à venda em Alphaville e Santana de Parnaíba — Radar S.A. Imóveis",
    description: "Procura terreno em condomínio em Alphaville, Tamboré ou Santana de Parnaíba para construir ou investir? Ative o Radar com metragem, região e orçamento.",
    h1: "Terrenos em Alphaville e região",
    intro: ["Informe a metragem desejada, a finalidade — construir, investir ou desenvolver um projeto — e as regiões de interesse.", "Nossa equipe acompanha os terrenos disponíveis em condomínio e avisa quando surgir o lote certo."],
    faq: [
      { q: "Vocês ajudam com as regras de construção do condomínio?", a: "Sim. Informamos recuos, gabarito e exigências de cada loteamento antes da compra." },
      { q: "Terreno em aclive ou declive faz diferença?", a: "Faz no custo da obra. No Radar você pode indicar sua preferência de topografia." },
      { q: "É possível financiar terreno?", a: "Alguns bancos financiam terrenos e também a construção. Orientamos conforme o seu caso." },
    ],
  }),
  p({
    slug: "apartamento-para-casa", interest: "move_to_house",
    title: "Trocar apartamento por casa em Alphaville — Radar S.A. Imóveis",
    description: "Hora de sair do apartamento e ir para uma casa em condomínio? Ative o Radar e encontre casas em Alphaville e região com mais espaço e privacidade.",
    h1: "Do apartamento para uma casa em condomínio",
    intro: ["Mais espaço, quintal, privacidade: conte o que motivou a mudança e quanto pretende investir.", "Se for preciso vender o apartamento atual, o Radar também considera essa etapa no planejamento."],
    faq: [
      { q: "Posso usar meu apartamento como parte do pagamento?", a: "Em alguns casos, sim, por permuta. Indique no questionário e avaliamos as possibilidades." },
      { q: "Vocês vendem meu apartamento também?", a: "Sim. Podemos conduzir a venda do apartamento e a compra da casa em conjunto." },
      { q: "Casa em condomínio tem custo alto de manutenção?", a: "Varia por condomínio. Informamos taxa condominial e IPTU de cada opção." },
    ],
  }),
  p({
    slug: "mudar-de-regiao", interest: "change_location",
    title: "Mudar de região ou condomínio em Alphaville — Radar S.A. Imóveis",
    description: "Quer mudar de bairro ou de condomínio em Alphaville, Tamboré ou Santana de Parnaíba? Compare regiões pela sua rotina com o Radar S.A. Imóveis.",
    h1: "Mudar de região ou de condomínio",
    intro: ["Conte onde mora hoje, o que não funciona mais e o que procura: escolas, acesso, segurança, lazer.", "Nossa equipe compara regiões e condomínios e apresenta as opções que melhoram a sua rotina."],
    faq: [
      { q: "Vocês ajudam a comparar condomínios?", a: "Sim. Comparamos estrutura, taxa condominial, segurança e acesso de cada condomínio." },
      { q: "Estou vindo de outra cidade. O Radar serve para mim?", a: "Serve. Ele é ótimo para quem ainda não conhece a região." },
      { q: "Preciso vender meu imóvel atual antes?", a: "Não necessariamente. Indicamos a melhor sequência para o seu caso." },
    ],
  }),
  p({
    slug: "oportunidade", interest: "specific_opportunity",
    title: "Oportunidades de imóveis abaixo do mercado em Alphaville — Radar S.A. Imóveis",
    description: "Ative um alerta para oportunidades de imóveis em Alphaville: preço abaixo da média, condição comercial especial ou localização específica.",
    h1: "Encontrar uma oportunidade específica",
    intro: ["Tem um imóvel, condomínio ou condição comercial em mente? Descreva o que procura e o valor máximo.", "Quando aparecer algo com esse perfil, a nossa equipe avisa você antes de virar anúncio."],
    faq: [
      { q: "O que é uma oportunidade para vocês?", a: "Imóveis com preço por m² abaixo da referência da região, vendas urgentes ou condições comerciais especiais." },
      { q: "Onde vejo as oportunidades atuais?", a: "Na nossa Vitrine de Oportunidades, em /oportunidades." },
      { q: "Posso pedir um condomínio específico?", a: "Pode. Quanto mais específico, mais preciso é o alerta." },
    ],
  }),
  p({
    slug: "vender", interest: "sell_property",
    title: "Vender imóvel em Alphaville — Radar S.A. Imóveis",
    description: "Quer vender sua casa, apartamento ou terreno em Alphaville e região? Ative o Radar e receba uma análise inicial de preço e estratégia de venda.",
    h1: "Vender o seu imóvel em Alphaville",
    intro: ["Informe o tipo, a localização, o valor que espera e o prazo para vender.", "Fazemos uma análise inicial de posicionamento de preço e apresentamos o imóvel à nossa base de compradores qualificados."],
    faq: [
      { q: "Vocês fazem avaliação do imóvel?", a: "Sim. Apresentamos uma análise baseada em vendas e anúncios comparáveis da região." },
      { q: "Preciso dar exclusividade?", a: "Não é obrigatório, mas a exclusividade costuma acelerar a venda. Conversamos sobre isso no atendimento." },
      { q: "Quanto tempo leva para vender?", a: "Depende do preço e do tipo de imóvel. Imóveis bem posicionados vendem mais rápido." },
    ],
  }),
  p({
    slug: "anunciar-aluguel", interest: "list_for_rent",
    title: "Anunciar imóvel para alugar em Alphaville — Radar S.A. Imóveis",
    description: "Tem um imóvel para alugar em Alphaville, Tamboré ou Barueri? Ative o Radar e receba apoio para definir o valor e encontrar o inquilino certo.",
    h1: "Colocar o seu imóvel para alugar",
    intro: ["Conte quando o imóvel fica disponível e quanto espera receber por mês.", "Ajudamos a definir o aluguel, divulgar, analisar o inquilino e, se quiser, administrar a locação."],
    faq: [
      { q: "Vocês fazem a administração do aluguel?", a: "Sim. Cobramos, repassamos e acompanhamos a manutenção e as vistorias." },
      { q: "Como vocês analisam o inquilino?", a: "Fazemos análise cadastral e de crédito e exigimos uma garantia locatícia." },
      { q: "O imóvel precisa estar mobiliado?", a: "Não. Atendemos imóveis vazios, semimobiliados e mobiliados." },
    ],
  }),
  p({
    slug: "imovel-parado", interest: "idle_property",
    title: "Imóvel parado em Alphaville: vender, alugar ou reformar — Radar S.A. Imóveis",
    description: "Seu imóvel está parado gerando custo? Ative o Radar e avalie com a S.A Imóveis se é melhor vender, alugar, reformar ou reposicionar.",
    h1: "Tenho um imóvel parado. E agora?",
    intro: ["Condomínio, IPTU e manutenção continuam chegando mesmo com o imóvel vazio. Conte há quanto tempo ele está parado e o estado em que se encontra.", "Apresentamos os caminhos possíveis — vender, alugar, reformar ou reposicionar — com os números de cada um."],
    faq: [
      { q: "Vale a pena reformar antes de vender?", a: "Às vezes. Pequenas reformas podem aumentar a liquidez; avaliamos caso a caso." },
      { q: "Vocês fazem reforma?", a: "Sim, a S.A Imóveis também conduz reformas." },
      { q: "Por que meu imóvel não vende?", a: "Os motivos mais comuns são preço acima do mercado, fotos ruins ou pouca divulgação. Analisamos o seu caso." },
    ],
  }),
  p({
    slug: "orientacao", interest: "guided_discovery",
    title: "Não sei se compro, alugo ou invisto — orientação Radar S.A. Imóveis",
    description: "Ainda não sabe qual é a melhor opção de imóvel para você? Responda o Radar e receba uma orientação inicial da S.A Imóveis Alphaville.",
    h1: "Ainda não sei qual é a melhor opção",
    intro: ["Comprar ou alugar? Casa ou apartamento? Pronto ou na planta? Responda algumas perguntas sobre o seu momento.", "A nossa equipe devolve uma orientação inicial, sem compromisso, para você decidir com segurança."],
    faq: [
      { q: "A orientação tem custo?", a: "Não. É uma conversa inicial gratuita." },
      { q: "Vou ser pressionado a fechar negócio?", a: "Não. O objetivo é ajudar você a entender as opções." },
      { q: "Posso mudar de objetivo depois?", a: "Claro. Você pode refazer o Radar quando quiser." },
    ],
  }),
];

export function radarPageBySlug(slug: string) {
  return RADAR_PAGES.find((x) => x.slug === slug);
}
export function radarSlugForInterest(interest: string) {
  return RADAR_PAGES.find((x) => x.interest === interest)?.slug;
}
