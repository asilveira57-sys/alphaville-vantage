import neoLogo from "@/assets/neo-alphaville-logo.png.asset.json";

export type EmpreendimentoMpd = {
  slug: string;
  name: string;
  builder: string;
  location: string;
  status: string;
  /** Faixa de metragem exibida no card (dados do projeto, nunca do banco de imóveis). */
  sizes: string;
  /** Rótulo do campo de metragem (ex.: "Tipologias do projeto"). */
  sizesLabel: string;
  delivery: string | null;
  summary: string;
  image: string | null;
  route: string;
  active: boolean;
};

/**
 * Fonte única de dados dos empreendimentos MPD.
 * Espelha exatamente o conteúdo já corrigido nas páginas individuais.
 */
export const MPD_EMPREENDIMENTOS: EmpreendimentoMpd[] = [
  {
    slug: "andromeda-by-mpd",
    name: "Andrômeda by MPD",
    builder: "MPD",
    location: "Alphaville, Barueri",
    status: "Em construção",
    sizes: "90 m² e 123 m²",
    sizesLabel: "Metragens",
    delivery: "Outubro de 2028",
    summary:
      "Projeto residencial em construção em Alphaville, com plantas de 90 m² e 123 m² e áreas comuns pensadas para o dia a dia.",
    image: null,
    route: "/empreendimentos/andromeda-by-mpd",
    active: true,
  },
  {
    slug: "terrah-alphaville",
    name: "Terrah Alphaville",
    builder: "MPD",
    location: "Alphagran Alphaville, Barueri",
    status: "Em construção",
    sizes: "240 m² a 815 m²",
    sizesLabel: "Metragens",
    delivery: "Setembro de 2027",
    summary:
      "Empreendimento em construção no Alphagran, com plantas amplas e cobertura, voltado a quem busca metragens generosas na região.",
    image: null,
    route: "/empreendimentos/terrah-alphaville",
    active: true,
  },
  {
    slug: "flora-alphaville",
    name: "Florá Alphaville",
    builder: "MPD",
    location: "Alphagran Alphaville, Barueri",
    status: "Em construção",
    sizes: "420 m² a 835 m²",
    sizesLabel: "Metragens",
    delivery: "Setembro de 2026",
    summary:
      "Projeto de alto padrão no Alphagran, com plantas de 420 m² a 835 m², incluindo opções duplex e triplex.",
    image: null,
    route: "/empreendimentos/flora-alphaville",
    active: true,
  },
  {
    slug: "neo-alphaville",
    name: "Neo Alphaville",
    builder: "MPD",
    location: "Alphaville Empresarial, Barueri",
    status: "Entregue",
    sizes: "239 m² a 432 m²",
    sizesLabel: "Tipologias do projeto",
    delivery: null,
    summary:
      "Empreendimento entregue na Avenida Sagitário, com unidades prontas e oportunidades de revenda na região.",
    image: neoLogo.url,
    route: "/empreendimentos/neo-alphaville",
    active: true,
  },
];

export const MPD_EMPREENDIMENTOS_ATIVOS = MPD_EMPREENDIMENTOS.filter(
  (e) => e.active && e.slug.trim().length > 0,
);
