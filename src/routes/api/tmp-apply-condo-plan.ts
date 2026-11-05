// TEMPORÁRIO — removido após aplicar o plano de condomínios. Só funciona no sandbox (lê /tmp).
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/tmp-apply-condo-plan")({
  server: { handlers: { POST: async ({ request }) => {
    const fs = await import("node:fs");
    const token = fs.readFileSync("/tmp/cx/token", "utf8").trim();
    if (request.headers.get("x-token") !== token) return new Response("no", { status: 403 });
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const ops = JSON.parse(fs.readFileSync("/tmp/cx/ops.json", "utf8"));
    const errors: string[] = []; let done = 0;
    for (const o of ops) {
      let e: { message: string } | null = null;
      if (o.t === "insert") ({ error: e } = await sb.from(o.table).insert(o.row));
      else if (o.t === "update") ({ error: e } = await sb.from(o.table).update(o.set).eq("id", o.id));
      else if (o.t === "redirect") {
        await sb.from("seo_redirects").update({ new_url: o.new }).eq("new_url", o.old);
        const { data: ex } = await sb.from("seo_redirects").select("id").eq("old_url", o.old).maybeSingle();
        ({ error: e } = ex ? await sb.from("seo_redirects").update({ new_url: o.new, active: true, redirect_type: 301, note: "troca_condominio" }).eq("id", ex.id)
          : await sb.from("seo_redirects").insert({ old_url: o.old, new_url: o.new, redirect_type: 301, active: true, note: "troca_condominio" }));
      }
      if (e) errors.push(`${o.t} ${o.table ?? ""} ${o.id ?? o.old ?? ""}: ${e.message}`); else done++;
    }
    return Response.json({ done, errors });
  } } },
});
