import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  message: z.string().trim().min(5, "Escreva sua mensagem").max(1000),
  website: z.string().max(200).optional().or(z.literal("")), // campo isca
  landing_page: z.string().trim().max(300).optional().or(z.literal("")),
});

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    // Robô preencheu o campo isca: finge sucesso e não grava nada.
    if (data.website) return { ok: true as const };

    const guard = await import("./signup-guard.server");
    let phone: string | null = null;
    if (data.phone) {
      phone = guard.localPhoneDigits(data.phone);
      if (!phone) throw new Error("Telefone inválido. Use DDD + número.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const headers = getRequest()?.headers;
    const ipHash = guard.hashIp(guard.clientIp(headers));
    if (await guard.rateLimited(supabaseAdmin as never, ipHash, "contato")) {
      throw new Error("Muitas mensagens enviadas agora. Tente novamente em alguns minutos.");
    }
    await guard.recordAttempt(supabaseAdmin as never, ipHash, "contato");

    const { data: row, error } = await supabaseAdmin
      .from("contact_messages")
      .insert({
        name: data.name,
        email: data.email,
        phone,
        message: data.message,
        landing_page: data.landing_page || "/contato",
        ip_hash: ipHash,
        user_agent: headers?.get("user-agent")?.slice(0, 300) ?? null,
      })
      .select("id")
      .single();
    if (error) {
      console.error("[contato] insert failed", error.message);
      throw new Error("Não foi possível enviar agora. Tente novamente.");
    }
    const { dispatchLeadEmails } = await import("./lead-emails.server");
    await dispatchLeadEmails("contact_messages", row.id);
    return { ok: true as const };
  });
