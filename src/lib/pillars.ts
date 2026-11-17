/**
 * Pilares editoriais do portal. Cada post ou guia (editorial_pages, tipos blog e guia)
 * pertence a um pilar pelo campo categoria_editorial, que guarda o `label` exato daqui.
 * Cada pilar tem uma página /temas/{slug} que lista os conteúdos dele.
 */
export type Pillar = {
  slug: string;
  label: string;
  h1: string;
  lead: string;
  metaDescription: string;
};

export const PILLARS: Pillar[] = [
  {
    slug: "morar",
    label: "Morar",
    h1: "Morar em Alphaville, Tamboré e região",
    lead: "Bairros, condomínios, custo de vida, segurança e mercado imobiliário de Alphaville, Tamboré, Barueri e Santana de Parnaíba, para quem está decidindo onde morar.",
    metaDescription: "Guias para decidir onde morar em Alphaville: bairros, condomínios, custo de vida, segurança, aluguel e mercado imobiliário em Barueri e Santana de Parnaíba.",
  },
  {
    slug: "educacao",
    label: "Educação",
    h1: "Escolas e educação em Alphaville",
    lead: "Escolas particulares, bilíngues e internacionais, e faculdades de Alphaville, Tamboré, Barueri e Santana de Parnaíba.",
    metaDescription: "Escolas particulares, bilíngues e internacionais e faculdades em Alphaville, Tamboré, Barueri e Santana de Parnaíba: guias com endereço, perfil e região.",
  },
  {
    slug: "gastronomia",
    label: "Gastronomia",
    h1: "Gastronomia em Alphaville e região",
    lead: "Restaurantes, pizzarias, sushi, churrascarias e bares de Alphaville, Tamboré, Barueri e Santana de Parnaíba, com curadoria de quem mora na região.",
    metaDescription: "Onde comer em Alphaville: restaurantes, pizzarias, sushi, churrascarias e happy hour em Alphaville, Tamboré, Barueri e Santana de Parnaíba.",
  },
  {
    slug: "lazer-e-passeios",
    label: "Lazer e passeios",
    h1: "Lazer e passeios em Alphaville",
    lead: "Parques, centro histórico, feiras e programas de fim de semana em Alphaville, Barueri e Santana de Parnaíba.",
    metaDescription: "O que fazer em Alphaville e região: parques, passeios, centro histórico de Santana de Parnaíba, feiras e programas de fim de semana.",
  },
  {
    slug: "esporte",
    label: "Esporte",
    h1: "Esporte e clubes em Alphaville",
    lead: "Clubes, golfe, tênis, hipismo, academias e esportes ao ar livre em Alphaville e Tamboré.",
    metaDescription: "Clubes, golfe, tênis, hipismo, academias e esportes em Alphaville e Tamboré: estrutura esportiva da região para moradores.",
  },
  {
    slug: "cultura",
    label: "Cultura",
    h1: "Cultura e história de Alphaville",
    lead: "A história de Alphaville e da região, música ao vivo, casas de show e a vida cultural de Barueri e Santana de Parnaíba.",
    metaDescription: "História de Alphaville, música ao vivo, casas de show e vida cultural em Barueri e Santana de Parnaíba.",
  },
  {
    slug: "saude",
    label: "Saúde",
    h1: "Saúde em Alphaville: hospitais e clínicas",
    lead: "Hospitais, prontos-socorros e clínicas de referência que atendem Alphaville, Tamboré, Barueri e Santana de Parnaíba.",
    metaDescription: "Hospitais, prontos-socorros e clínicas de referência em Alphaville, Tamboré, Barueri e Santana de Parnaíba.",
  },
  {
    slug: "negocios",
    label: "Negócios",
    h1: "Negócios e trabalho em Alphaville",
    lead: "Centros empresariais, grandes empresas, benefícios fiscais de Barueri, coworkings e mercado corporativo do eixo Castello Branco.",
    metaDescription: "Negócios em Alphaville: centros empresariais, grandes empresas, benefícios fiscais de Barueri, coworkings e salas comerciais no eixo Castello Branco.",
  },
  {
    slug: "lifestyle",
    label: "Lifestyle",
    h1: "Lifestyle em Alphaville",
    lead: "Shoppings, compras, carros e experiências de alto padrão em Alphaville e Tamboré.",
    metaDescription: "Shoppings, compras e experiências de alto padrão em Alphaville e Tamboré.",
  },
  {
    slug: "religiao",
    label: "Religião",
    h1: "Igrejas e religião em Alphaville",
    lead: "Igrejas, paróquias e comunidades religiosas de Alphaville, Tamboré, Barueri e Santana de Parnaíba.",
    metaDescription: "Igrejas, paróquias e comunidades religiosas em Alphaville, Tamboré, Barueri e Santana de Parnaíba, com horários e endereços.",
  },
];

export const pillarBySlug = (slug: string) => PILLARS.find((p) => p.slug === slug) ?? null;
export const pillarByLabel = (label: string | null | undefined) => PILLARS.find((p) => p.label === label) ?? null;
