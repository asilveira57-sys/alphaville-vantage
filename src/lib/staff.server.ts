// Quem é equipe: administradores (admin) e corretores (corretor), lidos de user_roles.
import type { SupabaseClient } from "@supabase/supabase-js";

export async function serviceDb(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

export type StaffInfo = { userId: string; isAdmin: boolean; isCorretor: boolean };

export async function staffInfo(userId: string): Promise<StaffInfo> {
  const sb = await serviceDb();
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId);
  const roles = new Set(((data ?? []) as { role: string }[]).map((r) => r.role));
  return { userId, isAdmin: roles.has("admin"), isCorretor: roles.has("corretor") };
}

/** Garante administrador ou corretor. */
export async function requireStaff(userId: string): Promise<StaffInfo> {
  const s = await staffInfo(userId);
  if (!s.isAdmin && !s.isCorretor) throw new Error("Acesso só para a equipe da S.A.");
  return s;
}
