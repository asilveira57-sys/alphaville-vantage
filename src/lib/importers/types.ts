// Contrato comum entre parsers de fontes diferentes.
// Fase 1 (extração) devolve SEMPRE um RawListing; nada aqui é relacionado
// com cadastros internos — isso é responsabilidade do normalizador/matcher.

export type RawListing = {
  parser: string;
  sourceLabel: string;
  url: string;
  externalCode: string | null;
  internalCode: string | null;

  title: string | null;
  descriptionHtml: string | null;
  descriptionText: string | null;

  purpose: "sale" | "rent" | "both" | null;
  propertyTypeText: string | null;

  address: {
    postalCode: string | null;
    state: string | null;
    city: string | null;
    neighborhood: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    condominiumText: string | null;
  };

  areas: {
    total: number | null;
    built: number | null;
    useful: number | null;
    land: number | null;
  };

  rooms: {
    bedrooms: number | null;
    suites: number | null;
    bathrooms: number | null;
    lavabos: number | null;
    parking: number | null;
    parkingCovered: number | null;
    parkingUncovered: number | null;
  };

  prices: {
    sale: number | null;
    rent: number | null;
    condoFee: number | null;
    iptu: number | null;
  };

  features: string[];
  condoFeatures: string[];
  unknownFeatures: string[];

  images: string[];

  seo: {
    title: string | null;
    description: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
  };

  notFound: string[];
};

export type ParserResult = {
  listing: RawListing;
  log: Record<string, unknown>;
};
