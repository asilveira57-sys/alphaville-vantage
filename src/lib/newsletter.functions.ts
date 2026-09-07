import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().max(255),
  source: z.string().trim().max(60).optional(),
  /** Campo isca: humano nunca preenche, robô preenche. */
  empresa: z.string().max(200).optional(),
});

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    // Robô: devolvemos sucesso e não gravamos nada.
    if (data.empresa && data.empresa.trim() !== "") return { ok: true };

    const { validEmail, hashIp, clientIp, rateLimited, recordAttempt } = await import(
      "./signup-guard.server"
    );

    const email = data.email.trim().toLowerCase();
    if (!validEmail(email)) throw new Error("Informe um e-mail válido.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ipHash = hashIp(clientIp(getRequest()?.headers));

    if (await rateLimited(supabaseAdmin as never, ipHash, "newsletter")) {
      throw new Error("Muitas tentativas agora. Tente novamente em alguns minutos.");
    }
    await recordAttempt(supabaseAdmin as never, ipHash, "newsletter");

    const { error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .insert({ email, source: data.source ?? "home" });

    // Duplicidade é sucesso silencioso: a pessoa já está na lista.
    if (error && error.code !== "23505") {
      throw new Error("Não foi possível concluir agora. Tente novamente em instantes.");
    }
    return { ok: true, already: error?.code === "23505" };
  });
