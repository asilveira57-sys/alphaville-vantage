import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { EMAIL_TEMPLATES, LEAD_INBOX } from "@/lib/email-defaults";
import { listEmailSettings, previewEmail, saveEmailSettings, sendEmailTest } from "@/lib/email-admin.functions";

export const Route = createFileRoute("/_authenticated/admin-emails")({
  head: () => ({
    meta: [
      { title: "E-mails — Admin S.A Imóveis" },
      { name: "description", content: "Gestão dos e-mails automáticos do site." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminEmails,
});

type Form = {
  template_name: string; enabled: boolean; subject: string; heading: string; intro: string;
  outro: string; cta_label: string; cta_url: string; recipient_override: string | null;
};

function AdminEmails() {
  const list = useServerFn(listEmailSettings);
  const save = useServerFn(saveEmailSettings);
  const preview = useServerFn(previewEmail);
  const test = useServerFn(sendEmailTest);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["email-settings"], queryFn: () => list() });
  const [sel, setSel] = useState(EMAIL_TEMPLATES[0].name);
  const [form, setForm] = useState<Form | null>(null);
  const [html, setHtml] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [testTo, setTestTo] = useState(LEAD_INBOX);
  const def = EMAIL_TEMPLATES.find((t) => t.name === sel)!;

  useEffect(() => {
    if (!q.data) return;
    const s = q.data.settings.find((r: any) => r.template_name === sel);
    setForm({
      template_name: sel, enabled: s ? s.enabled : true,
      subject: s?.subject || def.subject, heading: s?.heading || def.heading, intro: s?.intro || def.intro,
      outro: s?.outro || def.outro, cta_label: s?.cta_label || def.cta_label, cta_url: s?.cta_url || def.cta_url,
      recipient_override: s?.recipient_override ?? null,
    });
    setMsg(null);
  }, [sel, q.data]);

  useEffect(() => {
    if (!form) return;
    const t = setTimeout(() => {
      preview({ data: form as any }).then((r) => setHtml(r.html)).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [form]);

  const enabledMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const r of q.data?.settings ?? []) m[r.template_name] = r.enabled;
    return m;
  }, [q.data]);

  const input = "w-full border border-ink/20 bg-background px-3 py-2 text-sm";
  const set = (k: keyof Form, v: any) => form && setForm({ ...form, [k]: v });

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <Link to="/admin" className="text-xs uppercase tracking-widest text-muted-foreground">← Admin</Link>
        <h1 className="font-serif text-4xl mt-2">E-mails</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aviso de lead novo para a equipe e confirmação para o cliente. Variáveis: {"{nome} {origem} {pagina} {resumo} {email} {telefone}"}
        </p>

        <div className="grid lg:grid-cols-[240px_1fr_1fr] gap-6 mt-8">
          <div className="space-y-1">
            {EMAIL_TEMPLATES.map((t) => (
              <button key={t.name} onClick={() => setSel(t.name)}
                className={`w-full text-left px-3 py-2 text-sm border ${sel === t.name ? "border-ink bg-ink text-canvas" : "border-ink/15"}`}>
                {t.label}
                <span className="block text-[10px] uppercase tracking-widest opacity-70">
                  {t.audience} · {enabledMap[t.name] === false ? "desligado" : "ligado"}
                </span>
              </button>
            ))}
          </div>

          {form && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} /> Enviar este e-mail
              </label>
              {def.audience === "interno" && (
                <label className="block text-xs">Destinatário
                  <input className={input} value={form.recipient_override ?? ""} placeholder={LEAD_INBOX} onChange={(e) => set("recipient_override", e.target.value)} />
                </label>
              )}
              {(["subject", "heading"] as const).map((k) => (
                <label key={k} className="block text-xs">{k === "subject" ? "Assunto" : "Título"}
                  <input className={input} value={form[k]} onChange={(e) => set(k, e.target.value)} />
                </label>
              ))}
              {(["intro", "outro"] as const).map((k) => (
                <label key={k} className="block text-xs">{k === "intro" ? "Texto de abertura" : "Texto de fechamento"}
                  <textarea rows={4} className={input} value={form[k]} onChange={(e) => set(k, e.target.value)} />
                </label>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs">Texto do botão
                  <input className={input} value={form.cta_label} onChange={(e) => set("cta_label", e.target.value)} />
                </label>
                <label className="block text-xs">Link do botão
                  <input className={input} value={form.cta_url} onChange={(e) => set("cta_url", e.target.value)} />
                </label>
              </div>
              <div className="flex gap-2">
                <button className="bg-ink text-canvas px-4 py-2 text-xs uppercase tracking-widest"
                  onClick={async () => {
                    try { await save({ data: form as any }); setMsg("Salvo."); qc.invalidateQueries({ queryKey: ["email-settings"] }); }
                    catch (e) { setMsg((e as Error).message); }
                  }}>Salvar</button>
                <button className="border border-ink px-4 py-2 text-xs uppercase tracking-widest"
                  onClick={() => setForm({ ...form, subject: def.subject, heading: def.heading, intro: def.intro, outro: def.outro, cta_label: def.cta_label, cta_url: def.cta_url })}>
                  Restaurar padrão</button>
              </div>
              <div className="flex gap-2 pt-4 border-t border-ink/10">
                <input className={input} value={testTo} onChange={(e) => setTestTo(e.target.value)} />
                <button className="border border-ink px-4 py-2 text-xs uppercase tracking-widest whitespace-nowrap"
                  onClick={async () => {
                    setMsg("Enviando teste…");
                    try { const r = await test({ data: { template_name: sel, to: testTo } }); setMsg(r.sent ? "Teste enviado (salve antes para testar o texto novo)." : "Não enviado — veja o histórico."); qc.invalidateQueries({ queryKey: ["email-settings"] }); }
                    catch (e) { setMsg((e as Error).message); }
                  }}>Enviar teste</button>
              </div>
              {msg && <p className="text-sm">{msg}</p>}
            </div>
          )}

          <div className="border border-ink/15 bg-white min-h-[500px]">
            <iframe title="Prévia" srcDoc={html} className="w-full h-[700px]" />
          </div>
        </div>

        <h2 className="font-serif text-2xl mt-12 mb-3">Histórico de envios</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="py-2">Data</th><th>Modelo</th><th>Destinatário</th><th>Situação</th><th>Erro</th></tr></thead>
            <tbody>
              {(q.data?.log ?? []).map((r: any) => (
                <tr key={r.id} className="border-t border-ink/10">
                  <td className="py-2">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                  <td>{EMAIL_TEMPLATES.find((t) => t.name === r.template_name)?.label ?? r.template_name}</td>
                  <td>{r.recipient}</td>
                  <td>{r.status}</td>
                  <td className="text-xs text-muted-foreground max-w-xs truncate">{r.error}</td>
                </tr>
              ))}
              {q.data && q.data.log.length === 0 && <tr><td colSpan={5} className="py-4 text-muted-foreground">Nenhum envio ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </SiteLayout>
  );
}
