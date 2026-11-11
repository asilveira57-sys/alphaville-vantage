import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { publicClient } from "./property-search.functions";

export const getPropertyBlocked = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1).max(220) }).parse(d))
  .handler(async ({ data }) => {
    const { data: blocked, error } = await publicClient().rpc("property_is_blocked", { p_slug: data.slug });
    if (error) throw new Error(error.message);
    return Boolean(blocked);
  });

export const setPropertyBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; blocked: boolean }) => z.object({ id: z.string().uuid(), blocked: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) { setResponseStatus(403); throw new Error("Acesso restrito a administradores"); }
    const { error } = await context.supabase.rpc("set_property_block", { p_id: data.id, p_blocked: data.blocked });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listBlockedProperties = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { page: number }) => z.object({ page: z.number().int().min(1) }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) { setResponseStatus(403); throw new Error("Acesso restrito a administradores"); }
    const { data: rows, error, count } = await context.supabase.from("properties")
      .select("id,internal_code,title,slug,manual_overrides", { count: "exact" })
      .or("review_status.eq.bloqueado_manual,manual_overrides->>blocked.eq.true")
      .order("updated_at", { ascending: false }).range((data.page - 1) * 30, data.page * 30 - 1);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });