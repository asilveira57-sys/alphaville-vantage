// Symbolic placeholder articles for navigation across editorial sections.
// Each entry powers /artigos/$slug via EditorialArticle. Replace with real
// publications over time — the keys / slugs can stay stable.

export interface SymbolicArticle {
  eyebrow: string;
  title: string;
  lead: string;
  parent: { label: string; to: string };
  html: string;
  related?: { label: string; to: string }[];
}

const p = (html: string) => html.trim();

export const SYMBOLIC_ARTICLES: Record<string, SymbolicArticle> = {
  // ───────────── Guia Alphaville ─────────────
  "alphaville-residenciais-pioneiros": {
    eyebrow: "Residenciais",
    title: "Os primeiros condomínios de Alphaville",
    lead: "Como surgiram os Residenciais 1, 2 e 3 e por que continuam icônicos no imaginário da região.",
    parent: { label: "Guia Alphaville", to: "/guia-alphaville" },
    html: p(`
      <h2 id="origem">Origem do projeto</h2>
      <p>No final dos anos 1970, a Albuquerque, Takaoka idealizou um modelo inédito no Brasil: lotes residenciais com infraestrutura completa, segurança perimetral e amplas áreas verdes a poucos quilômetros da capital. Nasciam os Residenciais Alphaville 1, 2 e 3.</p>
      <h2 id="urbanismo">Urbanismo e arborização</h2>
      <p>Ruas largas, recuos generosos e arborização densa marcaram um padrão de cidade-jardim que se tornou referência nacional. Décadas depois, são justamente essas árvores adultas que sustentam o microclima ameno dos residenciais pioneiros.</p>
      <h2 id="legado">O legado no mercado</h2>
      <p>Casas dos primeiros residenciais convivem hoje com reformas contemporâneas e reposicionamentos arquitetônicos. O ticket por metro construído continua entre os mais valorizados do eixo.</p>
      <p><em>Publicação simbólica. Em breve, com entrevistas e arquivo histórico.</em></p>
    `),
    related: [
      { label: "Principais escolas particulares", to: "/artigos/alphaville-escolas" },
      { label: "Restaurantes do Calçadão", to: "/artigos/alphaville-calcadao" },
    ],
  },
  "alphaville-escolas": {
    eyebrow: "Educação",
    title: "Principais escolas particulares de Alphaville",
    lead: "Da educação infantil ao ensino médio bilíngue: uma visão editorial das instituições de referência.",
    parent: { label: "Guia Alphaville", to: "/guia-alphaville" },
    html: p(`
      <h2 id="panorama">Panorama</h2>
      <p>Alphaville concentra dezenas de instituições de ensino, da educação infantil ao ensino médio internacional. A oferta cresceu junto com os residenciais e hoje atrai famílias de toda a região metropolitana.</p>
      <h2 id="perfis">Perfis predominantes</h2>
      <ul>
        <li><strong>Escolas bilíngues</strong> com currículo internacional.</li>
        <li><strong>Tradicionais</strong> com forte preparação para vestibular.</li>
        <li><strong>Pedagogias ativas</strong> (construtivista, Waldorf, Reggio Emilia).</li>
      </ul>
      <h2 id="proximas">Próximas publicações</h2>
      <p>Estamos preparando perfis individuais de cada instituição com mensalidades, calendário e diferenciais pedagógicos.</p>
    `),
    related: [
      { label: "Os primeiros condomínios", to: "/artigos/alphaville-residenciais-pioneiros" },
      { label: "Hospitais e clínicas de referência", to: "/artigos/alphaville-saude" },
    ],
  },
  "alphaville-calcadao": {
    eyebrow: "Gastronomia",
    title: "Restaurantes do Calçadão",
    lead: "Da culinária autoral às pizzarias clássicas que definem o Calçadão de Alphaville.",
    parent: { label: "Guia Alphaville", to: "/guia-alphaville" },
    html: p(`
      <h2 id="endereco">O endereço-síntese</h2>
      <p>Mais que uma rua, o Calçadão é um corredor gastronômico maduro, com casas de longa data e novos endereços autorais. Reúne pizzarias, bistrôs, hamburguerias e cafés em ambiente pedestre.</p>
      <h2 id="cenas">Cenas paralelas</h2>
      <p>O eixo se ampliou para galerias e centros comerciais próximos, com cozinhas asiáticas, mediterrâneas e brasileiras contemporâneas.</p>
      <p><em>Em breve: roteiro fotográfico com curadoria editorial completa.</em></p>
    `),
    related: [
      { label: "Restaurantes da região", to: "/restaurantes" },
      { label: "Os primeiros condomínios", to: "/artigos/alphaville-residenciais-pioneiros" },
    ],
  },
  "alphaville-parques-clubes": {
    eyebrow: "Lazer",
    title: "Parques e clubes de Alphaville",
    lead: "Estrutura esportiva, áreas verdes e centros sociais que sustentam a vida cotidiana.",
    parent: { label: "Guia Alphaville", to: "/guia-alphaville" },
    html: p(`
      <h2 id="clubes">Clubes privativos</h2>
      <p>Quase todos os residenciais mantêm clubes internos com piscinas, quadras, salões de festa e programação social. Alguns somam estrutura para tênis, futebol e modalidades aquáticas.</p>
      <h2 id="publicos">Áreas públicas</h2>
      <p>Parques municipais nas cercanias complementam a oferta com trilhas, ciclovias e áreas de piquenique de uso aberto.</p>
    `),
    related: [
      { label: "Parques e trilhas", to: "/meio-ambiente/lazer" },
      { label: "Áreas de preservação", to: "/meio-ambiente/areas" },
    ],
  },
  "alphaville-mobilidade": {
    eyebrow: "Mobilidade",
    title: "Castelo Branco e Rodoanel: o eixo de Alphaville",
    lead: "Acessos, fluxo e o futuro da mobilidade regional.",
    parent: { label: "Guia Alphaville", to: "/guia-alphaville" },
    html: p(`
      <h2 id="eixos">Eixos principais</h2>
      <p>A Castelo Branco conecta Alphaville à capital em poucos minutos fora dos horários de pico. O Rodoanel Mário Covas abriu uma alternativa para quem se desloca para o ABC, Guarulhos e Campinas sem cruzar a marginal Tietê.</p>
      <h2 id="horarios">Horários e fluxo</h2>
      <p>Os picos da manhã (7h-9h sentido capital) e tarde (18h-20h sentido interior) seguem sendo o gargalo histórico. Trabalho híbrido e novos polos corporativos vêm redistribuindo a demanda.</p>
    `),
    related: [{ label: "Mercado corporativo", to: "/artigos/mercado-corporativo" }],
  },
  "alphaville-saude": {
    eyebrow: "Saúde",
    title: "Hospitais e clínicas de referência",
    lead: "Rede médica que atende a região: hospitais gerais, especialidades e centros diagnósticos.",
    parent: { label: "Guia Alphaville", to: "/guia-alphaville" },
    html: p(`
      <h2 id="hospitais">Hospitais gerais</h2>
      <p>A região conta com unidades de grandes redes hospitalares e hospitais locais consolidados, com pronto-socorro 24h e maternidade.</p>
      <h2 id="clinicas">Especialidades e diagnóstico</h2>
      <p>Centros de imagem, laboratórios e clínicas especializadas formam um ecossistema completo, com tempo de deslocamento curto a partir dos condomínios.</p>
    `),
  },

  // ───────────── Guia Tamboré ─────────────
  "tambore-residenciais": {
    eyebrow: "Residenciais",
    title: "Tamboré 1 ao 11: diferenças e perfis",
    lead: "Como cada Tamboré se diferencia em traçado urbano, perfil de morador e dinâmica de preços.",
    parent: { label: "Guia Tamboré", to: "/guia-tambore" },
    html: p(`
      <h2 id="visao">Visão geral</h2>
      <p>O complexo Tamboré reúne onze residenciais, cada um com características próprias de lote, arquitetura predominante e clube interno. A diversidade explica por que famílias migram entre eles ao longo dos ciclos de vida.</p>
      <h2 id="dinamica">Dinâmica de preços</h2>
      <p>Os Tamborés mais antigos consolidaram valor de revenda; os mais recentes atraem demanda por arquitetura contemporânea e amenidades atualizadas.</p>
    `),
    related: [
      { label: "Estrutura esportiva e social", to: "/artigos/tambore-clubes" },
      { label: "Valorização e liquidez", to: "/artigos/tambore-mercado" },
    ],
  },
  "tambore-clubes": {
    eyebrow: "Clubes",
    title: "Estrutura esportiva e social do Tamboré",
    lead: "Golfe, equitação, tênis e clubes familiares — o ecossistema de lazer que define o Tamboré.",
    parent: { label: "Guia Tamboré", to: "/guia-tambore" },
    html: p(`
      <h2 id="golfe">Golfe e equitação</h2>
      <p>O Tamboré abriga um dos campos de golfe mais tradicionais da região metropolitana, além de centros equestres ativos.</p>
      <h2 id="familia">Vida em família</h2>
      <p>Clubes internos com piscina, quadras e programação infantil sustentam a rotina de famílias com filhos em idade escolar.</p>
    `),
  },
  "tambore-mercado": {
    eyebrow: "Mercado",
    title: "Valorização e liquidez no Tamboré",
    lead: "Por que o m² do Tamboré é um dos mais disputados do estado.",
    parent: { label: "Guia Tamboré", to: "/guia-tambore" },
    html: p(`
      <h2 id="liquidez">Liquidez</h2>
      <p>Imóveis bem precificados no Tamboré costumam circular em poucos meses, especialmente nas faixas mais demandadas de área útil.</p>
      <h2 id="valorizacao">Valorização</h2>
      <p>O ciclo recente combina escassez de terrenos, demanda por arquitetura contemporânea e migração de famílias da capital.</p>
    `),
    related: [{ label: "Mercado imobiliário da região", to: "/mercado-imobiliario" }],
  },

  // ───────────── Guia Barueri ─────────────
  "barueri-beneficios-fiscais": {
    eyebrow: "Economia",
    title: "Benefícios fiscais de Barueri",
    lead: "Por que tantas empresas escolhem se instalar em Barueri.",
    parent: { label: "Guia Barueri", to: "/guia-barueri" },
    html: p(`
      <h2 id="iss">ISS competitivo</h2>
      <p>Barueri adota alíquotas e regimes que atraem prestadores de serviços, especialmente de tecnologia, consultoria e finanças.</p>
      <h2 id="efeito">Efeito sobre a região</h2>
      <p>A concentração corporativa fortalece o mercado de locação residencial e o varejo de alto padrão.</p>
    `),
    related: [
      { label: "Grandes corporações instaladas", to: "/artigos/barueri-corporacoes" },
      { label: "Mercado corporativo", to: "/artigos/mercado-corporativo" },
    ],
  },
  "barueri-corporacoes": {
    eyebrow: "Empresas",
    title: "Grandes corporações instaladas em Barueri",
    lead: "Um panorama do mercado de trabalho local e dos polos corporativos.",
    parent: { label: "Guia Barueri", to: "/guia-barueri" },
    html: p(`
      <h2 id="poles">Polos corporativos</h2>
      <p>Barueri concentra sedes regionais e nacionais de empresas de tecnologia, bens de consumo, serviços financeiros e telecomunicações.</p>
      <h2 id="trabalho">Mercado de trabalho</h2>
      <p>O ecossistema gera demanda contínua por moradia próxima — fator estrutural para o mercado imobiliário regional.</p>
    `),
  },
  "barueri-mobilidade": {
    eyebrow: "Mobilidade",
    title: "Castelo Branco e Rodoanel em Barueri",
    lead: "Os eixos viários que sustentam o polo corporativo e residencial.",
    parent: { label: "Guia Barueri", to: "/guia-barueri" },
    html: p(`
      <h2 id="ferroviario">CPTM e ferroviário</h2>
      <p>A estação de Barueri da Linha 8-Diamante complementa o acesso rodoviário, ainda subutilizada por usuários de alto padrão.</p>
      <h2 id="futuro">Futuro</h2>
      <p>Projetos de mobilidade ativa e novos corredores prometem reduzir a dependência do carro nos próximos ciclos.</p>
    `),
  },

  // ───────────── Guia Santana de Parnaíba ─────────────
  "santana-centro-historico": {
    eyebrow: "História",
    title: "Centro histórico tombado de Santana de Parnaíba",
    lead: "Casarões coloniais, igrejas e o legado bandeirante preservado em pleno século XXI.",
    parent: { label: "Guia Santana de Parnaíba", to: "/guia-santana-de-parnaiba" },
    html: p(`
      <h2 id="tombamento">Tombamento e preservação</h2>
      <p>O centro histórico de Santana de Parnaíba é um dos conjuntos coloniais mais bem preservados do estado, com tombamento estadual e federal.</p>
      <h2 id="circuito">Circuito histórico</h2>
      <p>Casarões dos séculos XVII e XVIII, igrejas e o calçamento original convivem com restaurantes, cafés e antiquários.</p>
    `),
    related: [
      { label: "Restaurantes premiados", to: "/artigos/santana-restaurantes" },
      { label: "Novos residenciais", to: "/artigos/santana-residenciais" },
    ],
  },
  "santana-residenciais": {
    eyebrow: "Condomínios",
    title: "Novos residenciais em Santana de Parnaíba",
    lead: "Onde Santana cresce e por que atrai novos moradores.",
    parent: { label: "Guia Santana de Parnaíba", to: "/guia-santana-de-parnaiba" },
    html: p(`
      <h2 id="eixos">Eixos de expansão</h2>
      <p>Os novos condomínios se distribuem no entorno do Alphaville Empresarial e em direção ao interior, com lotes maiores e topografia movimentada.</p>
      <h2 id="perfil">Perfil dos compradores</h2>
      <p>Famílias em busca de mais área útil e contato direto com mata nativa, mantendo acesso rápido ao polo corporativo.</p>
    `),
  },
  "santana-restaurantes": {
    eyebrow: "Gastronomia",
    title: "Restaurantes premiados de Santana de Parnaíba",
    lead: "Da culinária tradicional aos novos endereços autorais.",
    parent: { label: "Guia Santana de Parnaíba", to: "/guia-santana-de-parnaiba" },
    html: p(`
      <h2 id="tradicao">Tradição</h2>
      <p>O centro histórico abriga endereços clássicos de comida brasileira, com cozinha caipira e doces conventuais.</p>
      <h2 id="autoral">Cena autoral</h2>
      <p>Nos últimos anos, chefs jovens abriram casas autorais que ampliam o repertório gastronômico da cidade.</p>
    `),
  },

  // ───────────── Mercado Imobiliário ─────────────
  "mercado-condominios-valorizados": {
    eyebrow: "Valorização",
    title: "Condomínios mais valorizados da região",
    lead: "Ranking editorial baseado em dados públicos e transações observadas no período recente.",
    parent: { label: "Mercado imobiliário", to: "/mercado-imobiliario" },
    html: p(`
      <h2 id="metodologia">Metodologia</h2>
      <p>Combinamos dados públicos de registro, observação de anúncios e conversas com corretores ativos no segmento de alto padrão.</p>
      <h2 id="leitura">Leitura do ciclo</h2>
      <p>Condomínios com escassez de terrenos e arquitetura contemporânea lideram a valorização recente.</p>
      <p><em>Versão simbólica — o ranking completo será publicado em breve.</em></p>
    `),
    related: [
      { label: "Locação de alto padrão", to: "/artigos/mercado-locacao" },
      { label: "Estratégias de valorização", to: "/artigos/investimento-capital" },
    ],
  },
  "mercado-locacao": {
    eyebrow: "Locação",
    title: "Locação de alto padrão na região",
    lead: "Cenário, tickets médios e perfis de inquilino no alto padrão.",
    parent: { label: "Mercado imobiliário", to: "/mercado-imobiliario" },
    html: p(`
      <h2 id="demanda">Demanda</h2>
      <p>Executivos em mobilidade corporativa, famílias em transição patrimonial e expatriados sustentam a demanda por locação no alto padrão.</p>
      <h2 id="tickets">Tickets</h2>
      <p>Os contratos se concentram em faixas amplas, fortemente influenciadas por amenidades do condomínio e estado do imóvel.</p>
    `),
  },
  "mercado-corporativo": {
    eyebrow: "Corporativo",
    title: "Mercado corporativo do eixo Castelo Branco",
    lead: "Salas comerciais, galpões e o eixo Castelo Branco em perspectiva.",
    parent: { label: "Mercado imobiliário", to: "/mercado-imobiliario" },
    html: p(`
      <h2 id="lajes">Lajes corporativas</h2>
      <p>Os edifícios do Alphaville Empresarial e arredores mantêm baixa vacância e demanda estável de empresas de tecnologia e serviços.</p>
      <h2 id="logistica">Logística</h2>
      <p>O eixo Castelo Branco / Rodoanel é um dos principais polos logísticos do país, com galpões classe A em expansão.</p>
    `),
  },

  // ───────────── Investimentos ─────────────
  "investimento-renda": {
    eyebrow: "Renda",
    title: "Locação de alto padrão como ativo de renda",
    lead: "Cenário, ticket médio e retorno por bairro.",
    parent: { label: "Investimentos", to: "/investimentos" },
    html: p(`
      <h2 id="retorno">Retorno-aluguel</h2>
      <p>O yield bruto no alto padrão tende a ser inferior ao de segmentos econômicos, compensado por estabilidade contratual e baixa inadimplência.</p>
      <h2 id="ativos">Ativos preferidos</h2>
      <p>Casas em condomínio com layout flexível e apartamentos em condomínios consolidados costumam apresentar melhor liquidez de locação.</p>
    `),
    related: [{ label: "Locação de alto padrão", to: "/artigos/mercado-locacao" }],
  },
  "investimento-capital": {
    eyebrow: "Capital",
    title: "Estratégias de valorização",
    lead: "Quais regiões e tipos de imóvel estão em ciclo de alta.",
    parent: { label: "Investimentos", to: "/investimentos" },
    html: p(`
      <h2 id="vetores">Vetores de valorização</h2>
      <p>Escassez de terrenos, melhorias de mobilidade e adensamento de serviços costumam anteceder ciclos de alta.</p>
      <h2 id="risco">Gestão de risco</h2>
      <p>Diversificar por região e tipologia reduz a exposição a ciclos locais.</p>
    `),
  },
  "investimento-corporativo": {
    eyebrow: "Corporativo",
    title: "Galpões e salas comerciais como investimento",
    lead: "Investimento no eixo Castelo Branco.",
    parent: { label: "Investimentos", to: "/investimentos" },
    html: p(`
      <h2 id="galpoes">Galpões logísticos</h2>
      <p>Contratos atípicos de longo prazo e demanda estrutural por logística sustentam o segmento.</p>
      <h2 id="salas">Salas comerciais</h2>
      <p>Mais voláteis no ciclo, exigem leitura cuidadosa de vacância local antes da alocação.</p>
    `),
  },

  // ───────────── Restaurantes ─────────────
  "restaurantes-alta-cozinha": {
    eyebrow: "Alta cozinha",
    title: "Melhores restaurantes para ocasiões especiais",
    lead: "Os endereços de referência para jantares marcantes na região.",
    parent: { label: "Restaurantes", to: "/restaurantes" },
    html: p(`
      <h2 id="curadoria">Curadoria editorial</h2>
      <p>Selecionamos casas com cozinha consistente, serviço atento e ambiente preparado para celebrações.</p>
      <h2 id="proximas">Próximas publicações</h2>
      <p>Em breve, fichas individuais com fotos, menu, faixa de preço e dicas de reserva.</p>
    `),
    related: [
      { label: "Melhores pizzarias", to: "/artigos/restaurantes-pizzarias" },
      { label: "Restaurantes do Calçadão", to: "/artigos/alphaville-calcadao" },
    ],
  },
  "restaurantes-pizzarias": {
    eyebrow: "Italiano",
    title: "Melhores pizzarias da região",
    lead: "Da napolitana clássica à autoral contemporânea.",
    parent: { label: "Restaurantes", to: "/restaurantes" },
    html: p(`
      <h2 id="estilos">Estilos</h2>
      <p>Convivem na região pizzarias de forno a lenha tradicional, casas com forno a gás de longa fermentação e propostas autorais com massa de longa maturação.</p>
    `),
  },
  "restaurantes-hamburguerias": {
    eyebrow: "Casual",
    title: "Melhores hamburguerias",
    lead: "Do smash burger à carta gourmet.",
    parent: { label: "Restaurantes", to: "/restaurantes" },
    html: p(`
      <h2 id="cena">Cena local</h2>
      <p>A região acompanhou o boom nacional do hambúrguer artesanal e mantém casas consolidadas em todos os principais centros comerciais.</p>
    `),
  },
  "restaurantes-mercados": {
    eyebrow: "Mercado",
    title: "Supermercados e empórios",
    lead: "Onde fazer compras especiais — de empórios italianos a açougues premium.",
    parent: { label: "Restaurantes", to: "/restaurantes" },
    html: p(`
      <h2 id="rede">Rede de abastecimento</h2>
      <p>Supermercados de alto padrão, empórios étnicos e açougues especializados cobrem o dia a dia das famílias da região.</p>
    `),
  },
};

export function getSymbolicArticle(slug: string): SymbolicArticle | null {
  return SYMBOLIC_ARTICLES[slug] ?? null;
}
