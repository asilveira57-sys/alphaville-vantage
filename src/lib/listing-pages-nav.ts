/**
 * Seleções vivas de imóveis em destaque (/imoveis-alphaville/$slug), usadas no menu "Imóveis",
 * na home e no fim dos posts e guias. As páginas em si ficam na tabela listing_pages;
 * ao publicar uma nova seleção que deva aparecer no menu, acrescente aqui.
 */
export type ListingNavItem = { slug: string; label: string; group: "Comprar" | "Alugar" | "Condomínios" | "Comercial" };

export const LISTING_NAV: ListingNavItem[] = [
  { slug: "apartamentos-ate-750-mil", label: "Apartamentos até R$ 750 mil", group: "Comprar" },
  { slug: "apartamentos-2-quartos-ate-1-milhao", label: "Apartamentos 2 quartos até R$ 1 mi", group: "Comprar" },
  { slug: "apartamentos-3-quartos-ate-1-5-milhao", label: "Apartamentos 3 quartos até R$ 1,5 mi", group: "Comprar" },
  { slug: "casas-a-venda-1-a-2-milhoes", label: "Casas de R$ 1 a 2 mi", group: "Comprar" },
  { slug: "casas-4-quartos-ou-mais-a-venda", label: "Casas com 4 quartos ou mais", group: "Comprar" },
  { slug: "casas-a-venda-2-a-4-milhoes", label: "Casas de R$ 2 a 4 mi", group: "Comprar" },
  { slug: "casas-de-alto-padrao-acima-de-8-milhoes", label: "Casas de alto padrão", group: "Comprar" },
  { slug: "terrenos-a-venda", label: "Terrenos à venda", group: "Comprar" },
  { slug: "apartamentos-mobiliados-para-alugar", label: "Apartamentos mobiliados", group: "Alugar" },
  { slug: "apartamentos-para-alugar-ate-5-mil", label: "Apartamentos até R$ 5 mil", group: "Alugar" },
  { slug: "apartamentos-para-alugar-5-a-10-mil", label: "Apartamentos de R$ 5 a 10 mil", group: "Alugar" },
  { slug: "casas-em-condominio-para-alugar", label: "Casas em condomínio", group: "Alugar" },
  { slug: "apartamentos-a-venda-bellagio", label: "Bellagio", group: "Condomínios" },
  { slug: "apartamentos-a-venda-novare", label: "Novare", group: "Condomínios" },
  { slug: "apartamentos-a-venda-alpha-park", label: "Alpha Park", group: "Condomínios" },
  { slug: "apartamentos-a-venda-trix-tambore", label: "Trix Tamboré", group: "Condomínios" },
  { slug: "apartamentos-a-venda-alpha-vita", label: "Alpha Vita", group: "Condomínios" },
  { slug: "apartamentos-a-venda-life-park", label: "Life Park", group: "Condomínios" },
  { slug: "apartamentos-a-venda-gran-alphaville", label: "Gran Alphaville", group: "Condomínios" },
  { slug: "salas-comerciais-para-alugar", label: "Salas para alugar", group: "Comercial" },
  { slug: "salas-comerciais-a-venda", label: "Salas à venda", group: "Comercial" },
];

export const LISTING_GROUPS: ListingNavItem["group"][] = ["Comprar", "Alugar", "Condomínios", "Comercial"];
