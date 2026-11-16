import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireStaff, serviceDb, staffInfo } from "@/lib/staff.server";

// App do Corretor (/corretor): leads com dono e etapa, anotações e avisos no celular.
// Regras: todos da equipe veem todos os leads; lead sem dono pode ser "pego" por qualquer um;
// só o dono (ou um administrador) muda etapa e escreve anotações.

export const LEAD_STAGES = [
  { id: "novo", label: "Novo" },
  { id: "em_atendimento", label: "Em atendimento" },
  { id: "visita", label: "Visita marcada" },
  { id: "proposta", label: "Proposta" },
  { id: "fechado", label: "Fechado" },
  { id: "perdido", label: "Perdido" },
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number]["id"];
const STAGE_IDS = LEAD_STAGES.map((s) => s.id) as [LeadStage, ...LeadStage[]];

type Ctx = { userId: string };
const uid = (context: unknown) => (context as Ctx).userId;

// ---------- Sessão ----------

export const getStaffSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = uid(context);
    const s = await staffInfo(me);
    if (!s.isAdmin && !s.isCorretor) return { ok: false as const };
    const sb = await serviceDb();
    const { data: profile } = await sb.from("broker_profiles").select("display_name,photo_url,creci,whatsapp,active").eq("user_id", me).maybeSingle();
    return {
      ok: true as const,
      userId: me,
      isAdmin: s.isAdmin,
      isCorretor: s.isCorretor,
      profile: (profile as { display_name: string; photo_url: string | null; creci: string | null; whatsapp: string | null; active: boolean } | null) ?? null,
    };
  });

// ---------- Leads ----------

export type StaffLead = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string;
  source_label: string | null;
  summary: string | null;
  landing_page: string | null;
  stage: string;
  owner_user_id: string | null;
  owner_name: string | null;
  created_at: string;
};

async function ownerNames(ids: string[]): Promise<Map<string, string>> {
  const sb = await serviceDb();
  const map = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return map;
  const { data } = await sb.from("broker_profiles").select("user_id,display_name").in("user_id", unique);
  for (const r of (data ?? []) as { user_id: string; display_name: string }[]) map.set(r.user_id, r.display_name);
  for (const id of unique) {
    if (map.has(id)) continue;
    const { data: u } = await sb.auth.admin.getUserById(id);
    const meta = (u?.user?.user_metadata ?? {}) as Record<string, unknown>;
    map.set(id, (meta.full_name as string) || u?.user?.email || "Equipe");
  }
  return map;
}

const LEAD_COLS = "id,name,phone,email,source,source_label,summary,landing_page,stage,owner_user_id,created_at";

export const listStaffLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ scope: z.enum(["meus", "livres", "todos"]).default("meus"), q: z.string().trim().max(60).default("") }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const me = uid(context);
    await requireStaff(me);
    const sb = await serviceDb();
    let query = sb.from("leads").select(LEAD_COLS).order("created_at", { ascending: false }).limit(200);
    if (data.scope === "meus") query = query.eq("owner_user_id", me);
    if (data.scope === "livres") query = query.is("owner_user_id", null);
    const q = data.q.replace(/[%,()]/g, " ").trim();
    if (q.length >= 2) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q.replace(/\D/g, "") || q}%,summary.ilike.%${q}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as Omit<StaffLead, "owner_name">[];
    const names = await ownerNames(list.map((l) => l.owner_user_id ?? ""));
    const counts = await (async () => {
      const [{ count: mine }, { count: free }] = await Promise.all([
        sb.from("leads").select("id", { count: "exact", head: true }).eq("owner_user_id", me).not("stage", "in", "(fechado,perdido)"),
        sb.from("leads").select("id", { count: "exact", head: true }).is("owner_user_id", null),
      ]);
      return { mine: mine ?? 0, free: free ?? 0 };
    })();
    return {
      counts,
      leads: list.map((l) => ({ ...l, owner_name: l.owner_user_id ? names.get(l.owner_user_id) ?? null : null })) as StaffLead[],
    };
  });

export const getStaffLead = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const me = uid(context);
    const s = await requireStaff(me);
    const sb = await serviceDb();
    const { data: lead, error } = await sb.from("leads").select(`${LEAD_COLS},payload`).eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!lead) throw new Error("Lead não encontrado.");
    const { data: notes } = await sb.from("lead_notes").select("id,body,user_id,created_at").eq("lead_id", data.id).order("created_at", { ascending: false });
    const names = await ownerNames([lead.owner_user_id as string, ...((notes ?? []) as { user_id: string }[]).map((n) => n.user_id)]);
    return {
      lead: { ...(lead as unknown as StaffLead), owner_name: lead.owner_user_id ? names.get(lead.owner_user_id as string) ?? null : null },
      notes: ((notes ?? []) as { id: string; body: string; user_id: string; created_at: string }[]).map((n) => ({
        ...n,
        author: names.get(n.user_id) ?? "Equipe",
      })),
      canEdit: s.isAdmin || lead.owner_user_id === me,
      isMine: lead.owner_user_id === me,
    };
  });

export const claimLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const me = uid(context);
    await requireStaff(me);
    const sb = await serviceDb();
    const now = new Date().toISOString();
    const { data: row, error } = await sb
      .from("leads")
      .update({ owner_user_id: me, owner_at: now, stage: "em_atendimento", status: "atendido", handled_at: now, handled_by: me, updated_at: now })
      .eq("id", data.id)
      .is("owner_user_id", null)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Outro corretor já pegou este lead.");
    return { ok: true };
  });

async function assertCanEdit(me: string, leadId: string) {
  const s = await requireStaff(me);
  const sb = await serviceDb();
  const { data } = await sb.from("leads").select("owner_user_id").eq("id", leadId).maybeSingle();
  if (!data) throw new Error("Lead não encontrado.");
  if (!s.isAdmin && data.owner_user_id !== me) throw new Error("Este lead é de outro corretor.");
  return sb;
}

export const setLeadStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), stage: z.enum(STAGE_IDS) }).parse(d))
  .handler(async ({ context, data }) => {
    const me = uid(context);
    const sb = await assertCanEdit(me, data.id);
    const { error } = await sb.from("leads").update({ stage: data.stage, updated_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addLeadNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(1000) }).parse(d))
  .handler(async ({ context, data }) => {
    const me = uid(context);
    const sb = await assertCanEdit(me, data.id);
    const { error } = await sb.from("lead_notes").insert({ lead_id: data.id, user_id: me, body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin devolve o lead para "sem dono" ou passa para outro corretor. */
export const assignLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), userId: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ context, data }) => {
    const s = await requireStaff(uid(context));
    if (!s.isAdmin) throw new Error("Só administradores transferem leads.");
    const sb = await serviceDb();
    const { error } = await sb
      .from("leads")
      .update({ owner_user_id: data.userId, owner_at: data.userId ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Avisos no celular ----------

export const getPushPublicKey = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(uid(context));
    const { getVapidKeys } = await import("@/lib/push.server");
    return { publicKey: (await getVapidKeys()).publicKey };
  });

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      endpoint: z.string().url().max(1000),
      p256dh: z.string().min(20).max(200),
      auth: z.string().min(10).max(100),
      userAgent: z.string().max(300).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const me = uid(context);
    await requireStaff(me);
    const sb = await serviceDb();
    const { error } = await sb
      .from("push_subscriptions")
      .upsert({ user_id: me, endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth, user_agent: data.userAgent ?? null }, { onConflict: "endpoint" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ endpoint: z.string().url().max(1000) }).parse(d))
  .handler(async ({ context, data }) => {
    const me = uid(context);
    const sb = await serviceDb();
    await sb.from("push_subscriptions").delete().eq("endpoint", data.endpoint).eq("user_id", me);
    return { ok: true };
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = uid(context);
    await requireStaff(me);
    const { pushToUsers } = await import("@/lib/push.server");
    return pushToUsers([me], { title: "S.A Corretor", body: "Avisos ligados. Você vai receber os leads novos aqui.", url: "/corretor", tag: "teste" });
  });
