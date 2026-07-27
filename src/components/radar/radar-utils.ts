// Utilitários compartilhados do Radar (analytics, UTMs, máscaras, persistência local).
import { RADAR_FORM_VERSION } from "@/lib/radar-config";

export const RADAR_STORAGE_KEY = "sa_radar_progress_v1";

type AnalyticsPayload = Record<string, string | number | undefined>;

export function trackRadar(event: string, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };
  const data = { ...payload, form_version: RADAR_FORM_VERSION };
  try {
    if (typeof w.gtag === "function") w.gtag("event", event, data);
    else if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event, ...data });
  } catch {
    /* analytics nunca deve quebrar o fluxo */
  }
}

export type RadarTracking = {
  source?: string;
  campaign?: string;
  medium?: string;
  content?: string;
  term?: string;
  referrer?: string;
  landing_page?: string;
};

export function readTracking(): RadarTracking {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  return {
    source: p.get("utm_source") ?? "homepage_radar",
    campaign: p.get("utm_campaign") ?? undefined,
    medium: p.get("utm_medium") ?? undefined,
    content: p.get("utm_content") ?? undefined,
    term: p.get("utm_term") ?? undefined,
    referrer: document.referrer || undefined,
    landing_page: window.location.pathname + window.location.search,
  };
}

export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskCurrency(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 12);
  if (!d) return "";
  const number = Number(d) / 100;
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
