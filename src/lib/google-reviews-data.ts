export type GoogleReview = {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  date?: string;
};

export const PLACE_ID = "ChIJG4pE168Dz5QRbYWntjRt6AA";
/** Perfil oficial no Google (link informado pelo cliente). */
export const MAPS_URL =
  "https://www.google.com/search?hl=pt-BR&gl=br&q=S.A+Im%C3%B3veis+Alphaville+-+Av.+Marcos+Penteado+de+Ulh%C3%B4a+Rodrigues,+3866+-+Res.+Tambore+III,+Santana+de+Parna%C3%ADba+-+SP,+06543-001&ludocid=65422267767031149&lsig=AB86z5X7MxgLOIKoxenUK0jsrl2W#lrd=0x94cf03afd7448a1b:0xe86d34b6a7856d,1,,,,";
/** Mesmo perfil, abrindo direto o formulário de avaliação. */
export const WRITE_REVIEW_URL = MAPS_URL.replace(
  "0xe86d34b6a7856d,1,,,,",
  "0xe86d34b6a7856d,3,,,,",
);

/** Nota geral exibida na seção. Atualize manualmente. */
export const GOOGLE_RATING = 5.0;
/** Quantidade total de avaliações no Google. Atualize manualmente. */
export const GOOGLE_TOTAL_REVIEWS = 114;

/**
 * Avaliações reais publicadas no Google, cadastradas manualmente (máx. 6).
 * Copie o nome público, a nota e o texto original. Não invente depoimentos.
 */
export const GOOGLE_REVIEWS: GoogleReview[] = [
  {
    id: "rodrigo-oliveira",
    authorName: "Rodrigo Oliveira",
    rating: 5,
    date: "um mês atrás",
    text: "Tivemos uma ótima experiência com a S.A Imóveis. Foram atenciosos e ágeis na negociação e muito transparentes.",
  },
  {
    id: "rodrigo-alonso",
    authorName: "Rodrigo Alonso",
    rating: 5,
    date: "um mês atrás",
    text: "Super recomendo, muitos anos no mercado e super dedicados. Ótimas oportunidades.",
  },
  {
    id: "bianca-vilela",
    authorName: "Bianca Vilela",
    rating: 5,
    date: "um mês atrás",
    text: "Melhor atendimento!!! Recomendo",
  },
  {
    id: "andreza-silva",
    authorName: "Andreza Silva",
    rating: 5,
    date: "um mês atrás",
    text: "Excelente atendimento! Todos são muito prestativos e atenciosos. Quero destacar especialmente o João e o Gustavo, que são extremamente profissionais, educados e sempre dispostos a ajudar. Recomendo muito a imobiliária! 👏",
  },
  {
    id: "klelia-morais",
    authorName: "Klélia Maria Morais de Oliveira",
    rating: 5,
    date: "um mês atrás",
    text: "Fiquei super feliz com o atendimento na imobiliária S.A Imóveis Alphaville através do serviço prestado pelos senhores João Carvalho e Milton. Muita segurança, seriedade, transparência e confiança desde o início até o final da negociação. Uma imobiliária com várias opções e bons apartamentos com boa flexibilidade na negociação.",
  },
  {
    id: "bruno-pires",
    authorName: "Bruno Pires",
    rating: 5,
    date: "um mês atrás",
    text: "Excelente atendimento, profissionais preparados e acima de tudo com muito conhecimento sobre Alphaville, já aluguei apartamento com eles e também tive a experiência de realizar uma compra e tudo ocorreu 100% bem.",
  },
];
