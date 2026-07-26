export type GoogleReview = {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  date?: string;
};

export const PLACE_ID = "ChIJG4pE168Dz5QRbYWntjRt6AA";
export const WRITE_REVIEW_URL = `https://search.google.com/local/writereview?placeid=${PLACE_ID}`;
export const MAPS_URL = `https://www.google.com/maps/place/?q=place_id:${PLACE_ID}`;

/** Nota geral exibida na seção. Atualize manualmente. */
export const GOOGLE_RATING = 4.9;
/** Quantidade total de avaliações no Google. Atualize manualmente. */
export const GOOGLE_TOTAL_REVIEWS = 79;

/**
 * Avaliações reais publicadas no Google, cadastradas manualmente (máx. 6).
 * Copie o nome público, a nota e o texto original. Não invente depoimentos.
 */
export const GOOGLE_REVIEWS: GoogleReview[] = [
  {
    id: "igor-teixeira",
    authorName: "Igor Teixeira",
    rating: 5,
    date: "2 meses atrás",
    text: "João me mostrou muitas casa maravilhosas , hoje moro em uma com minha família, certamente uma parte do paraíso !\nSuper indico",
  },
  {
    id: "beatriz-nunes",
    authorName: "Beatriz nunes",
    rating: 5,
    date: "2 meses atrás",
    text: "Fui muito bem atendida! A equipe é super educada, paciente e realmente se preocupa em ajudar. Tornaram todo o processo muito mais tranquilo. Gratidão!",
  },
  {
    id: "alexandre-silveira",
    authorName: "Alexandre Silveira",
    rating: 5,
    date: "um mês atrás",
    text: "Atendimento Nota 1000. Resolveram minha vida aqui no Green Valley",
  },
  {
    id: "vera-melega",
    authorName: "Vera Melega",
    rating: 5,
    date: "2 meses atrás",
    text: "São muito pró ativos, conhecem bem a região e são confiáveis garantindo segurança na transação imobiliária.",
  },
  {
    id: "carlos-lopes",
    authorName: "Carlos Lopes",
    rating: 5,
    date: "2 meses atrás",
    text: "Excelente. Profissionais de alta qualidade com atendimento impecável!",
  },
  {
    id: "kelen-dotto",
    authorName: "Kelen Dotto",
    rating: 5,
    date: "2 meses atrás",
    text: "Excelentes corretores.\nImobiliária muito profissional e competente.",
  },
];
