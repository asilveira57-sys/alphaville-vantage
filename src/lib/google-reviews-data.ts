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
export const GOOGLE_RATING = 5;
/** Quantidade total de avaliações no Google. Atualize manualmente. */
export const GOOGLE_TOTAL_REVIEWS = 0;

/**
 * Avaliações reais publicadas no Google, cadastradas manualmente (máx. 6).
 * Copie o nome público, a nota e o texto original. Não invente depoimentos.
 */
export const GOOGLE_REVIEWS: GoogleReview[] = [];
