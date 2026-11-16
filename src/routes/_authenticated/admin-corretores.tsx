import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { SiteLayout } from "@/components/site-layout";
import { AdminGate, AdminPageHeader } from "@/components/admin/admin-gate";
import { listBrokers, saveBroker, type BrokerProfile } from "@/lib/proposals.functions";

export const Route = createFileRoute("/_authenticated/admin-corretores")({
  head: () => ({ meta: [{ title: "Admin · Corretores — Portal S.A" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (
    <AdminGate>
      <CorretoresPage />
    </AdminGate>
  ),
});

/** Foto de corpo sem fundo: mantém PNG (transparência), reduz para no máximo 1600 px de altura. */
async function figureToDataUrl(file: File): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Não consegui abrir a imagem."));
    i.src = URL.createObjectURL(file);
  });
  const scale = Math.min(1, 1600 / img.height);
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}

/** Reduz a foto no navegador para no máximo 900 px e JPEG, antes de enviar. */
async function fileToDataUrl(file: File): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Não consegui abrir a foto."));
    i.src = URL.createObjectURL(file);
  });
  const max = 900;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.88);
}

type Form = {
  user_id: string;
  display_name: string;
  creci: string;
  whatsapp: string;
  role_title: string;
  tagline: string;
  active: boolean;
  photo_url: string | null;
  photo_data_url: string | null;
  figure_url: string | null;
  figure_data_url: string | null;
  remove_figure: boolean;
};

const empty: Form = { user_id: "", display_name: "", creci: "", whatsapp: "", role_title: "Corretor", tagline: "", active: true, photo_url: null, photo_data_url: null, figure_url: null, figure_data_url: null, remove_figure: false };

function fromBroker(b: BrokerProfile): Form {
  return {
    user_id: b.user_id,
    display_name: b.display_name,
    creci: b.creci ?? "",
    whatsapp: b.whatsapp ?? "",
    role_title: b.role_title ?? "Corretor",
    tagline: b.tagline ?? "",
    active: b.active,
    photo_url: b.photo_url,
    photo_data_url: null,
    figure_url: b.figure_url,
    figure_data_url: null,
    remove_figure: false,
  };
}

const input = "w-full border border-ink/15 px-3 py-2.5 text-sm bg-transparent focus:outline-none focus:border-ink";

function CorretoresPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBrokers);
  const saveFn = useServerFn(saveBroker);
  const q = useQuery({ queryKey: ["brokers"], queryFn: () => listFn() });
  const [form, setForm] = useState<Form | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (f: Form) =>
      saveFn({
        data: {
          user_id: f.user_id,
          display_name: f.display_name,
          creci: f.creci || null,
          whatsapp: f.whatsapp || null,
          role_title: f.role_title || null,
          tagline: f.tagline || null,
          active: f.active,
          photo_data_url: f.photo_data_url,
          figure_data_url: f.figure_data_url,
          remove_figure: f.remove_figure,
        },
      }),
    onSuccess: () => {
      setForm(null);
      qc.invalidateQueries({ queryKey: ["brokers"] });
    },
  });

  const brokers = q.data?.brokers ?? [];
  const team = q.data?.team ?? [];
  const withoutProfile = team.filter((t) => !brokers.some((b) => b.user_id === t.userId));

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !form) return;
    setPhotoError(null);
    try {
      setForm({ ...form, photo_data_url: await fileToDataUrl(f) });
    } catch (err) {
      setPhotoError((err as Error).message);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form) save.mutate(form);
  };

  return (
    <SiteLayout>
      <div className="max-w-5xl mx-auto px-6 py-14">
        <AdminPageHeader eyebrow="Leads" title="Corretores">
          {!form && withoutProfile.length > 0 && (
            <button
              type="button"
              onClick={() => setForm({ ...empty })}
              className="bg-ink text-canvas px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink/85"
            >
              Novo corretor
            </button>
          )}
        </AdminPageHeader>

        <p className="text-sm text-muted-foreground -mt-6 mb-8 max-w-2xl">
          Foto, CRECI e WhatsApp que aparecem na capa das propostas enviadas aos clientes. Cada corretor
          precisa ter login no admin (Sistema → Equipe e acessos).
        </p>

        {q.error && <p className="text-sm text-red-600 mb-6">{(q.error as Error).message}</p>}

        {form && (
          <form onSubmit={submit} className="border border-ink/10 bg-white/40 p-6 mb-10 grid md:grid-cols-[180px_1fr] gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="h-36 w-36 rounded-full overflow-hidden bg-ink/10 flex items-center justify-center">
                {form.photo_data_url || form.photo_url ? (
                  <img src={form.photo_data_url ?? form.photo_url ?? ""} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">Sem foto</span>
                )}
              </div>
              <label className="cursor-pointer border border-ink/20 px-3 py-1.5 text-[11px] uppercase tracking-widest hover:bg-ink/5">
                {form.photo_url || form.photo_data_url ? "Trocar foto" : "Enviar foto"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPhoto} />
              </label>
              {photoError && <p className="text-xs text-red-600">{photoError}</p>}
              <div className="mt-4 w-full border-t border-ink/10 pt-4 flex flex-col items-center gap-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground text-center">Foto de corpo (proposta no computador)</p>
                <div className="h-40 w-28 bg-[#0D0D0D] flex items-end justify-center overflow-hidden">
                  {!form.remove_figure && (form.figure_data_url || form.figure_url) ? (
                    <img src={form.figure_data_url ?? form.figure_url ?? ""} alt="" className="max-h-full w-auto object-contain" />
                  ) : (
                    <span className="text-[10px] text-white/40 mb-3 px-2 text-center">Sem foto de corpo</span>
                  )}
                </div>
                <label className="cursor-pointer border border-ink/20 px-3 py-1.5 text-[11px] uppercase tracking-widest hover:bg-ink/5">
                  Enviar PNG sem fundo
                  <input
                    type="file"
                    accept="image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f || !form) return;
                      try {
                        setForm({ ...form, figure_data_url: await figureToDataUrl(f), remove_figure: false });
                      } catch (err) {
                        setPhotoError((err as Error).message);
                      }
                    }}
                  />
                </label>
                {(form.figure_url || form.figure_data_url) && !form.remove_figure && (
                  <button type="button" onClick={() => setForm({ ...form, figure_data_url: null, remove_figure: true })} className="text-[10px] uppercase tracking-widest text-red-700">
                    Tirar foto de corpo
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-3">
              {brokers.some((b) => b.user_id === form.user_id) ? null : (
                <select
                  required
                  value={form.user_id}
                  onChange={(e) => {
                    const t = team.find((x) => x.userId === e.target.value);
                    setForm({ ...form, user_id: e.target.value, display_name: form.display_name || t?.name || "" });
                  }}
                  className={input}
                >
                  <option value="">Login do corretor…</option>
                  {withoutProfile.map((t) => (
                    <option key={t.userId} value={t.userId}>
                      {t.name ? `${t.name} · ${t.email}` : t.email}
                    </option>
                  ))}
                </select>
              )}
              <input required value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Nome na proposta (ex.: João Carvalho)" className={input} />
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={form.creci} onChange={(e) => setForm({ ...form, creci: e.target.value })} placeholder="CRECI pessoal" className={input} />
                <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="WhatsApp com DDD (ex.: 11 99999-9999)" className={input} />
              </div>
              <input value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} placeholder="Cargo (ex.: Corretor)" className={input} />
              <input value={form.tagline} maxLength={120} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Frase curta (opcional, até 120 caracteres)" className={input} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Ativo (aparece para escolher nas propostas)
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={save.isPending} className="bg-ink text-canvas px-5 py-2.5 text-xs uppercase tracking-widest font-medium disabled:opacity-50">
                  {save.isPending ? "Salvando…" : "Salvar"}
                </button>
                <button type="button" onClick={() => setForm(null)} className="border border-ink/20 px-5 py-2.5 text-xs uppercase tracking-widest">
                  Cancelar
                </button>
              </div>
              {save.error && <p className="text-xs text-red-600">{(save.error as Error).message}</p>}
            </div>
          </form>
        )}

        {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          {brokers.map((b) => (
            <div key={b.user_id} className={`border border-ink/10 p-4 flex gap-4 items-center ${b.active ? "" : "opacity-50"}`}>
              <div className="h-16 w-16 rounded-full overflow-hidden bg-ink/10 shrink-0">
                {b.photo_url && <img src={b.photo_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0 text-sm">
                <div className="font-medium text-ink">{b.display_name}</div>
                <div className="text-xs text-muted-foreground">
                  {b.role_title ?? "Corretor"}
                  {b.creci ? ` · CRECI ${b.creci}` : " · sem CRECI"}
                </div>
                <div className="text-xs text-muted-foreground">{b.whatsapp ? `WhatsApp ${b.whatsapp}` : "sem WhatsApp"}</div>
              </div>
              <button type="button" onClick={() => setForm(fromBroker(b))} className="border border-ink/20 px-3 py-1.5 text-[11px] uppercase tracking-widest hover:bg-ink/5">
                Editar
              </button>
            </div>
          ))}
        </div>
        {!q.isLoading && !q.error && brokers.length === 0 && !form && (
          <p className="text-sm text-muted-foreground">Nenhum corretor cadastrado ainda.</p>
        )}
      </div>
    </SiteLayout>
  );
}
