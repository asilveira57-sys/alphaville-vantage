import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { checkIsAdmin } from "@/lib/admin.functions";
import {
  deleteMedia,
  getMediaUsage,
  listMedia,
  migrateEmbeddedImages,
  updateMedia,
  MEDIA_FOLDERS,
  MEDIA_FOLDER_LABELS,
  type MediaItem,
} from "@/lib/media.functions";
import { uploadToLibrary, MAX_UPLOAD_MB } from "@/lib/media-upload";

export const Route = createFileRoute("/_authenticated/admin-midia")({
  head: () => ({ meta: [{ title: "Admin · Biblioteca de mídia — Portal S.A" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminMedia,
});

function AdminMedia() {
  const qc = useQueryClient();
  const checkFn = useServerFn(checkIsAdmin);
  const listFn = useServerFn(listMedia);
  const updateFn = useServerFn(updateMedia);
  const deleteFn = useServerFn(deleteMedia);
  const migrateFn = useServerFn(migrateEmbeddedImages);

  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [migrateReport, setMigrateReport] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkFn() });
  const listQ = useQuery({
    queryKey: ["media", "admin", search, folder, from, to, page],
    queryFn: () => listFn({ data: { search: search || undefined, folder, from: from || undefined, to: to || undefined, page, pageSize: 48 } }),
    enabled: !!adminQ.data?.isAdmin,
  });

  const updateMut = useMutation({
    mutationFn: (v: Parameters<typeof updateMedia>[0]["data"]) => updateFn({ data: v }),
    onSuccess: (row) => { setSelected(row); qc.invalidateQueries({ queryKey: ["media"] }); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { setSelected(null); qc.invalidateQueries({ queryKey: ["media"] }); },
    onError: (e: Error) => setErr(e.message),
  });

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setErr(null);
    try {
      for (const f of Array.from(files)) {
        await uploadToLibrary(f, { folder: folder === "all" ? "geral" : folder });
      }
      qc.invalidateQueries({ queryKey: ["media"] });
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function runMigration(dryRun: boolean) {
    setBusy(true); setMigrateReport(null);
    try {
      const res = await migrateFn({ data: { dryRun } });
      setMigrateReport(
        res.report.length === 0
          ? "Nenhuma imagem embutida (base64) encontrada. Nada a migrar."
          : res.report.map((r) => `${r.label}: ${r.images} imagem(ns)${dryRun ? " a migrar" : ` — ${r.migrated} migradas`}`).join("\n"),
      );
      if (!dryRun) qc.invalidateQueries({ queryKey: ["media"] });
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  if (adminQ.isLoading) return <SiteLayout><div className="px-6 py-24 text-sm text-muted-foreground">Carregando…</div></SiteLayout>;
  if (!adminQ.data?.isAdmin) return <SiteLayout><div className="px-6 py-24 text-center text-sm text-muted-foreground">Acesso restrito. <Link to="/admin" className="underline">Ir para o painel</Link>.</div></SiteLayout>;

  const total = listQ.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 48));

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
            <h1 className="font-serif text-3xl">Biblioteca de mídia</h1>
            <p className="mt-1 text-xs text-muted-foreground">Limite de {MAX_UPLOAD_MB} MB por arquivo. JPG/PNG são convertidos automaticamente para WebP.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin" className="text-xs uppercase tracking-widest border border-ink/20 px-3 py-2 hover:bg-ink hover:text-canvas">Painel</Link>
            <Link to="/admin-ctas" className="text-xs uppercase tracking-widest border border-ink/20 px-3 py-2 hover:bg-ink hover:text-canvas">CTAs</Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Pesquisar pelo nome…"
            className="flex-1 min-w-[200px] border border-ink/15 px-3 py-2 text-sm bg-transparent" />
          <select value={folder} onChange={(e) => { setFolder(e.target.value); setPage(1); }} className="border border-ink/15 px-2 py-2 text-sm bg-transparent">
            <option value="all">Todas as pastas</option>
            {MEDIA_FOLDERS.map((f) => <option key={f} value={f}>{MEDIA_FOLDER_LABELS[f]}</option>)}
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-ink/15 px-2 py-2 text-sm bg-transparent" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-ink/15 px-2 py-2 text-sm bg-transparent" />
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
            className="text-xs uppercase tracking-widest bg-ink text-canvas px-4 py-2 disabled:opacity-50">
            {busy ? "Enviando…" : "Enviar imagens"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>

        {err && <p className="mb-4 text-xs text-red-600">{err}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <div>
            {listQ.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : total === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma imagem na biblioteca ainda.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  {listQ.data!.items.map((m) => (
                    <button key={m.id} type="button" onClick={() => { setSelected(m); setErr(null); }}
                      className={`text-left border transition ${selected?.id === m.id ? "border-ink" : "border-ink/10 hover:border-ink/40"}`}>
                      <img src={m.url} alt={m.alt_text ?? ""} loading="lazy"
                        width={m.width ?? undefined} height={m.height ?? undefined}
                        className="w-full aspect-square object-cover" />
                      <p className="px-2 py-1 text-[10px] truncate text-muted-foreground">{m.original_filename}</p>
                      {!m.alt_text && !m.is_decorative && <p className="px-2 pb-1 text-[10px] text-amber-600">sem alt</p>}
                    </button>
                  ))}
                </div>
                {pages > 1 && (
                  <div className="mt-6 flex items-center gap-2 text-xs">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="border border-ink/20 px-3 py-1.5 disabled:opacity-40">Anterior</button>
                    <span className="text-muted-foreground">Página {page} de {pages} · {total} imagens</span>
                    <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="border border-ink/20 px-3 py-1.5 disabled:opacity-40">Próxima</button>
                  </div>
                )}
              </>
            )}

            <div className="mt-12 border-t border-ink/10 pt-6">
              <h2 className="font-serif text-xl">Migração de imagens embutidas</h2>
              <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
                Procura imagens base64 dentro do HTML de posts, páginas e ruas, envia para o Storage, registra na biblioteca e troca pela URL permanente. A rotina é idempotente.
              </p>
              <div className="mt-3 flex gap-2">
                <button disabled={busy} onClick={() => runMigration(true)} className="text-xs uppercase tracking-widest border border-ink/20 px-3 py-2 disabled:opacity-50">Simular</button>
                <button disabled={busy} onClick={() => runMigration(false)} className="text-xs uppercase tracking-widest bg-ink text-canvas px-3 py-2 disabled:opacity-50">Executar migração</button>
              </div>
              {migrateReport && <pre className="mt-3 text-xs whitespace-pre-wrap text-muted-foreground">{migrateReport}</pre>}
            </div>
          </div>

          <aside className="border border-ink/10 p-4 h-fit sticky top-24">
            {!selected ? (
              <p className="text-xs text-muted-foreground">Selecione uma imagem para editar os metadados.</p>
            ) : (
              <MediaDetails
                item={selected}
                onSave={(patch) => updateMut.mutate({ id: selected.id, ...patch })}
                onDelete={() => deleteMut.mutate(selected.id)}
                saving={updateMut.isPending}
              />
            )}
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}

function MediaDetails({
  item, onSave, onDelete, saving,
}: {
  item: MediaItem;
  onSave: (patch: { title?: string | null; alt_text?: string | null; caption?: string | null; description?: string | null; folder?: string; is_decorative?: boolean }) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const usageFn = useServerFn(getMediaUsage);
  const usageQ = useQuery({ queryKey: ["media", "usage", item.id], queryFn: () => usageFn({ data: { mediaId: item.id } }) });

  const [title, setTitle] = useState(item.title ?? "");
  const [alt, setAlt] = useState(item.alt_text ?? "");
  const [caption, setCaption] = useState(item.caption ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const [folder, setFolder] = useState(item.folder);
  const [decorative, setDecorative] = useState(item.is_decorative);
  const [copied, setCopied] = useState(false);

  // Reset campos ao trocar de imagem
  const key = item.id;
  const [lastKey, setLastKey] = useState(key);
  if (lastKey !== key) {
    setLastKey(key);
    setTitle(item.title ?? ""); setAlt(item.alt_text ?? ""); setCaption(item.caption ?? "");
    setDescription(item.description ?? ""); setFolder(item.folder); setDecorative(item.is_decorative);
  }

  const filenameLike = alt.trim().toLowerCase() === item.original_filename.replace(/\.[^.]+$/, "").toLowerCase();

  return (
    <div className="space-y-3 text-sm">
      <img src={item.url} alt={item.alt_text ?? ""} className="w-full object-cover border border-ink/10" loading="lazy" />
      <p className="text-[11px] text-muted-foreground break-all">{item.original_filename}</p>
      <p className="text-[11px] text-muted-foreground">
        {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
        {item.mime_type ?? ""}{item.size_bytes ? ` · ${(item.size_bytes / 1024).toFixed(0)} KB` : ""}
      </p>

      <button type="button" onClick={() => { navigator.clipboard.writeText(item.url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="w-full text-xs uppercase tracking-widest border border-ink/20 px-3 py-2 hover:bg-ink hover:text-canvas">
        {copied ? "URL copiada!" : "Copiar URL"}
      </button>

      <Field label="Título"><input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-ink/15 px-2 py-1.5 bg-transparent" /></Field>
      <Field label="Texto alternativo (alt)">
        <input value={alt} onChange={(e) => setAlt(e.target.value)} disabled={decorative}
          className="w-full border border-ink/15 px-2 py-1.5 bg-transparent disabled:opacity-50" />
        {!decorative && !alt.trim() && <p className="mt-1 text-[11px] text-amber-600">Sem texto alternativo — obrigatório para publicar com acessibilidade.</p>}
        {!decorative && filenameLike && <p className="mt-1 text-[11px] text-amber-600">O alt está igual ao nome do arquivo. Revise para descrever a imagem.</p>}
      </Field>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={decorative} onChange={(e) => setDecorative(e.target.checked)} />
        Imagem decorativa (alt vazio)
      </label>
      <Field label="Legenda"><input value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full border border-ink/15 px-2 py-1.5 bg-transparent" /></Field>
      <Field label="Descrição"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full border border-ink/15 px-2 py-1.5 bg-transparent" /></Field>
      <Field label="Pasta">
        <select value={folder} onChange={(e) => setFolder(e.target.value)} className="w-full border border-ink/15 px-2 py-1.5 bg-transparent">
          {MEDIA_FOLDERS.map((f) => <option key={f} value={f}>{MEDIA_FOLDER_LABELS[f]}</option>)}
        </select>
      </Field>

      <button type="button" disabled={saving}
        onClick={() => onSave({ title: title || null, alt_text: decorative ? "" : alt || null, caption: caption || null, description: description || null, folder, is_decorative: decorative })}
        className="w-full text-xs uppercase tracking-widest bg-ink text-canvas px-3 py-2 disabled:opacity-50">
        {saving ? "Salvando…" : "Salvar metadados"}
      </button>

      <div className="border-t border-ink/10 pt-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Onde está sendo usada</p>
        {usageQ.isLoading ? <p className="text-xs text-muted-foreground">Verificando…</p>
          : (usageQ.data?.length ?? 0) === 0 ? <p className="text-xs text-muted-foreground">Não está em uso.</p>
          : <ul className="text-xs space-y-1">{usageQ.data!.map((u: any) => <li key={u.id}>{u.content_label || u.content_id} <span className="text-muted-foreground">({u.content_type})</span></li>)}</ul>}
      </div>

      <button type="button" onClick={onDelete}
        disabled={(usageQ.data?.length ?? 0) > 0}
        className="w-full text-xs uppercase tracking-widest border border-red-300 text-red-600 px-3 py-2 disabled:opacity-40">
        Excluir imagem
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}
