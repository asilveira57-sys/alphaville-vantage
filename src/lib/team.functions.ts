import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Equipe do admin: colaboradores com acesso total (papel "admin" em user_roles).
// Só administradores chamam estas funções; o cadastro usa a chave de serviço no servidor.

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: unknown }> }; userId: string };

async function assertAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Apenas administradores podem gerenciar a equipe.");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function findUserByEmail(email: string) {
  const sb = await admin();
  const target = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

export type TeamMember = {
  userId: string;
  email: string;
  name: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  isSelf: boolean;
};

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TeamMember[]> => {
    await assertAdmin(context as unknown as Ctx);
    const sb = await admin();
    const { data: roles, error } = await sb.from("user_roles").select("user_id").eq("role", "admin");
    if (error) throw new Error(error.message);
    const members: TeamMember[] = [];
    for (const r of roles ?? []) {
      const { data } = await sb.auth.admin.getUserById(r.user_id);
      const u = data?.user;
      const meta = (u?.user_metadata ?? {}) as Record<string, unknown>;
      members.push({
        userId: r.user_id,
        email: u?.email ?? "(usuário removido)",
        name: (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? null,
        createdAt: u?.created_at ?? null,
        lastSignInAt: u?.last_sign_in_at ?? null,
        isSelf: r.user_id === context.userId,
      });
    }
    return members.sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email, "pt-BR"));
  });

const passwordSchema = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(72);

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      name: z.string().trim().min(2, "Informe o nome.").max(120),
      email: z.string().trim().toLowerCase().email("E-mail inválido."),
      password: passwordSchema,
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context as unknown as Ctx);
    const sb = await admin();

    let userId: string;
    let existed = false;
    const created = await sb.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.name },
    });
    if (created.error) {
      const existing = await findUserByEmail(data.email);
      if (!existing) throw new Error(created.error.message);
      // Conta já existia (ex.: assinou a newsletter ou é parceiro): só libera o acesso.
      // A senha dela não é trocada aqui; use "Trocar senha" se precisar.
      userId = existing.id;
      existed = true;
    } else {
      userId = created.data.user.id;
    }

    const { data: has } = await sb.from("user_roles").select("user_id").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!has) {
      const { error } = await sb.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) throw new Error(error.message);
    }
    return { userId, existed };
  });

export const setTeamMemberPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), password: passwordSchema }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as unknown as Ctx);
    const sb = await admin();
    const { data: has } = await sb.from("user_roles").select("user_id").eq("user_id", data.userId).eq("role", "admin").maybeSingle();
    if (!has) throw new Error("Esse usuário não faz parte da equipe.");
    const { error } = await sb.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context as unknown as Ctx);
    if (data.userId === context.userId) throw new Error("Você não pode tirar o seu próprio acesso.");
    const sb = await admin();
    const { count } = await sb.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) <= 1) throw new Error("O portal precisa ter pelo menos um administrador.");
    // Tira só o acesso ao admin; a conta continua existindo (histórico, leads e auditoria ficam intactos).
    const { error } = await sb.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
