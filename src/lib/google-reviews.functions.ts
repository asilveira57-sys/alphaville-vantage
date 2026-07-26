import { createServerFn } from "@tanstack/react-start";

export type GoogleReview = {
  id: string;
  authorName: string;
  authorPhoto: string | null;
  authorUri: string | null;
  rating: number;
  text: string;
  relativeTime: string | null;
  uri: string | null;
};

export type GoogleReviewsPayload = {
  ok: boolean;
  name: string | null;
  rating: number | null;
  total: number | null;
  mapsUri: string | null;
  reviews: GoogleReview[];
  stale?: boolean;
};

const PLACE_ID = "ChIJG4pE168Dz5QRbYWntjRt6AA";
const TTL_MS = 24 * 60 * 60 * 1000;

// 24h in-memory cache (per worker isolate). Reviews are never persisted.
let cache: { at: number; data: GoogleReviewsPayload } | null = null;

export const getGoogleReviews = createServerFn({ method: "GET" }).handler(
  async (): Promise<GoogleReviewsPayload> => {
    const empty: GoogleReviewsPayload = {
      ok: false,
      name: null,
      rating: null,
      total: null,
      mapsUri: `https://www.google.com/maps/place/?q=place_id:${PLACE_ID}`,
      reviews: [],
    };

    if (cache && Date.now() - cache.at < TTL_MS) return cache.data;

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) return cache ? { ...cache.data, stale: true } : empty;

    try {
      const url =
        `https://places.googleapis.com/v1/places/${PLACE_ID}` +
        `?languageCode=pt-BR&regionCode=BR`;
      const res = await fetch(url, {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "displayName,rating,userRatingCount,reviews,googleMapsUri",
        },
      });
      if (!res.ok) {
        console.error("google places error", res.status, await res.text());
        return cache ? { ...cache.data, stale: true } : empty;
      }
      const json = (await res.json()) as {
        displayName?: { text?: string };
        rating?: number;
        userRatingCount?: number;
        googleMapsUri?: string;
        reviews?: Array<{
          name?: string;
          rating?: number;
          text?: { text?: string };
          originalText?: { text?: string };
          relativePublishTimeDescription?: string;
          googleMapsUri?: string;
          authorAttribution?: { displayName?: string; photoUri?: string; uri?: string };
        }>;
      };

      const data: GoogleReviewsPayload = {
        ok: true,
        name: json.displayName?.text ?? null,
        rating: typeof json.rating === "number" ? json.rating : null,
        total: typeof json.userRatingCount === "number" ? json.userRatingCount : null,
        mapsUri: json.googleMapsUri ?? empty.mapsUri,
        reviews: (json.reviews ?? [])
          .map((r, i) => ({
            id: r.name ?? `review-${i}`,
            authorName: r.authorAttribution?.displayName ?? "Cliente Google",
            authorPhoto: r.authorAttribution?.photoUri ?? null,
            authorUri: r.authorAttribution?.uri ?? null,
            rating: typeof r.rating === "number" ? r.rating : 0,
            text: (r.originalText?.text ?? r.text?.text ?? "").trim(),
            relativeTime: r.relativePublishTimeDescription ?? null,
            uri: r.googleMapsUri ?? null,
          }))
          .filter((r) => r.text.length > 0),
      };

      cache = { at: Date.now(), data };
      return data;
    } catch (error) {
      console.error("google places fetch failed", error);
      return cache ? { ...cache.data, stale: true } : empty;
    }
  },
);
