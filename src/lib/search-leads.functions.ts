import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizePhone } from "./opportunity-subscribers.functions";

export const SEARCH_LEAD_CONSENT =
  "Autorizo a S.A Imóveis Alphaville a entrar em contato comigo sobre esta pesquisa.";

const schema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().max(180).optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    channel: z.enum(["pdf", "whatsapp", "email"]),
    consent: z.boolean(),
    searchQuery: z.string().max(300).optional(),
    searchUrl: z.string().max(1500),
    filters: z.record(z.string(), z.unknown()).default({}),
    resultCount: z.number().int().min(0).max(100000),
    propertyIds: z.array(z.string().max(60)).max(60).default([]),
    empresa: z.string().max(200).optional(),
  })
  .refine((d) => Boolean(d.email) || Boolean(d.phone), {
    message: "Informe e-mail ou WhatsApp.",
    path: ["email"],
  });

export const saveSearchLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    if (data.empresa && data.empresa.trim() !== "") return { ok: true };
    const guard = await import("./signup-guard.server");

    const email = data.email ? data.email.toLowerCase() : null;
    if (email && !guard.validEmail(email)) throw new Error("Informe um e-mail válido.");
    let phone: string | null = null;
    if (data.phone) {
      phone = normalizePhone(data.phone);
      if (!phone || !guard.localPhoneDigits(data.phone)) throw new Error("WhatsApp inválido. Use DDD + número.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const headers = getRequest()?.headers;
    const ipHash = guard.hashIp(guard.clientIp(headers));
    if (await guard.rateLimited(supabaseAdmin as never, ipHash, "pesquisa")) {
      throw new Error("Muitas tentativas agora. Tente novamente em alguns minutos.");
    }
    await guard.recordAttempt(supabaseAdmin as never, ipHash, "pesquisa");

    const { error } = await supabaseAdmin.from("search_leads").insert({
      name: data.name,
      email,
      phone,
      channel: data.channel,
      search_query: data.searchQuery ?? null,
      search_url: data.searchUrl,
      filters: data.filters as never,
      result_count: data.resultCount,
      property_ids: data.propertyIds,
      consent_contact: data.consent,
      consent_text: data.consent ? SEARCH_LEAD_CONSENT : null,
      ip_hash: ipHash,
      user_agent: headers?.get("user-agent") ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type SearchLeadRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  channel: string;
  search_query: string | null;
  search_url: string;
  result_count: number;
  consent_contact: boolean;
  created_at: string;
};

export const listSearchLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SearchLeadRow[]> => {
    const { data, error } = await context.supabase
      .from("search_leads")
      .select("id,name,email,phone,channel,search_query,search_url,result_count,consent_contact,created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return (data ?? []) as SearchLeadRow[];
  });
