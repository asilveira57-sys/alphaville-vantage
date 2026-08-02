import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AuditEntry = {
  id: string;
  actor_id: string | null;
  actor_label: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  created_at: string;
};

async function assertEditor(ctx: { supabase: any; userId: string }) {
  const [{ data: isAdmin }, { data: isEditor }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "editor" }),
  ]);
  if (!isAdmin && !isEditor) throw new Error("Forbidden");
}

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        entityType: z.string().max(60).optional(),
        action: z.string().max(60).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(50),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertEditor(context);
    let q = context.supabase
      .from("cms_audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });
    if (data.entityType && data.entityType !== "all") q = q.eq("entity_type", data.entityType);
    if (data.action) q = q.ilike("action", `%${data.action}%`);
    const start = (data.page - 1) * data.pageSize;
    const { data: rows, error, count } = await q.range(start, start + data.pageSize - 1);
    if (error) throw new Error(error.message);
    return { items: (rows ?? []) as AuditEntry[], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });
