import { parseSaImoveis, SA_DOMAINS } from "./sa-imoveis.parser";
import type { ParserResult } from "./types";

export type ParserEntry = {
  id: string;
  label: string;
  matches: (url: URL) => boolean;
  parse: (html: string, url: string) => ParserResult;
};

export const PARSERS: ParserEntry[] = [
  {
    id: "sa-imoveis",
    label: "S.A. Imóveis — Site atual",
    matches: (u) => SA_DOMAINS.includes(u.hostname.toLowerCase()),
    parse: parseSaImoveis,
  },
];

export function pickParser(url: string): ParserEntry | null {
  try {
    const u = new URL(url);
    return PARSERS.find((p) => p.matches(u)) ?? null;
  } catch {
    return null;
  }
}
