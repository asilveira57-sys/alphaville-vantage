import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EMAIL_TEMPLATES } from "./email-defaults";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Acesso restrito ao admin.");
}

const names = EMAIL_TEMPLATES.map((t) => t.name) as [string, ...string[]];
const textsSchema = z.object({
  template_name: z.enum(names),
  enabled: z.boolean(),
  subject: z.string().max(200),
  heading: z.string().max(300),
  intro: z.string().max(3000),
  outro: z.string().max(3000),
  cta_label: z.string().max(80),
  cta_url: z.string().max(500),
  recipient_override: z.string().max(200).nullable().optional(),
});

export const listEmailSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from("email_template_settings").select("*");
    const { data: log } = await context.supabase
      .from("email_dispatch_log").select("*").order("created_at", { ascending: false }).limit(200);
    return { settings: (data ?? []) as any[], log: (log ?? []) as any[] };
  });

export const saveEmailSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => textsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("email_template_settings")
      .upsert({ ...data, recipient_override: data.recipient_override || null, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const previewEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => textsSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const React = await import("react");
    const { render } = await import("@react-email/render");
    const { buildProps } = await import("./lead-emails.server");
    const { TEMPLATES } = await import("./email-templates/registry");
    const vars = { nome: "Maria", origem: "Radar", pagina: "https://portal.saimoveisalpha.com.br/imoveis", resumo: "Casa em Alphaville", email: "maria@exemplo.com", telefone: "(11) 99999-0000" };
    const props = buildProps(data, vars, { details: [{ label: "Exemplo", value: "Detalhes do formulário aparecem aqui" }] });
    const html = await render(React.createElement(TEMPLATES[data.template_name].component, props));
    return { html, subject: props.subject ?? "" };
  });

export const sendEmailTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ template_name: z.enum(names), to: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTestEmail } = await import("./lead-emails.server");
    const r = await sendTestEmail(supabaseAdmin, data.template_name, data.to);
    return { sent: r.sent };
  });
