import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchAllRows } from "./fetch-all";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Acesso restrito ao admin.");
}

export type LeadRow = {
  id: string;
  source: string;
  source_label: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  landing_page: string | null;
  summary: string | null;
  payload: Record<string, unknown>;
  status: string;
  handled_at: string | null;
  created_at: string;
};

const COLS = "id,source,source_label,name,phone,email,landing_page,summary,payload,status,handled_at,created_at";

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const rows = await fetchAllRows<unknown>((from, to) =>
      context.supabase.from("leads").select(COLS).order("created_at", { ascending: false }).range(from, to) as any,
    );
    return JSON.parse(JSON.stringify(rows)) as Array<Omit<LeadRow, "payload"> & { payload: Record<string, string | number | boolean | null> }>;
  });

export const setLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["pendente", "atendido"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const atendido = data.status === "atendido";
    const { error } = await context.supabase
      .from("leads")
      .update({
        status: data.status,
        handled_at: atendido ? new Date().toISOString() : null,
        handled_by: atendido ? context.userId : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
