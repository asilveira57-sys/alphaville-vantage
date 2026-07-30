import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listMedia, MEDIA_FOLDERS, MEDIA_FOLDER_LABELS, type MediaItem } from "@/lib/media.functions";
import { uploadToLibrary } from "@/lib/media-upload";

type Props = {
  open: boolean;
  folder?: string;
  onClose: () => void;
  onSelect: (item: MediaItem) => void;
};

export function MediaPicker({ open, folder = "geral", onClose, onSelect }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const q = useQuery({
    queryKey: ["media", "picker", search, folderFilter, from],
    queryFn: () => listMedia({ data: { search: search || undefined, folder: folderFilter, from: from || undefined, page: 1, pageSize: 60 } }),
    enabled: open,
  });

  useEffect(() => {
    if (!open) { setErr(null); setSearch(""); }
  }, [open]);

  if (!open) return null;

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setErr(null);
    try {
      for (const f of Array.from(files)) {
        await uploadToLibrary(f, { folder });
      }
      await qc.invalidateQueries({ queryKey: ["media"] });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-12 bg-ink/50" onClick={onClose}>
      <div className="bg-canvas w-[980px] max-w-[94vw] max-h-[86vh] flex flex-col border border-ink/15 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-ink/10 flex items-center justify-between">
          <h3 className="font-serif text-lg">Biblioteca de mídia</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-3 border-b border-ink/10 flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar pelo nome…"
            className="flex-1 min-w-[180px] border border-ink/15 px-3 py-1.5 text-sm bg-transparent"
          />
          <select value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)}
            className="border border-ink/15 px-2 py-1.5 text-sm bg-transparent">
            <option value="all">Todas as pastas</option>
            {MEDIA_FOLDERS.map((f) => <option key={f} value={f}>{MEDIA_FOLDER_LABELS[f]}</option>)}
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="border border-ink/15 px-2 py-1.5 text-sm bg-transparent" />
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
            className="text-xs uppercase tracking-widest border border-ink/20 px-3 py-2 hover:bg-ink hover:text-canvas disabled:opacity-50">
            {busy ? "Enviando…" : "Enviar imagens"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>

        {err && <p className="px-5 py-2 text-xs text-red-600">{err}</p>}

        <div className="flex-1 overflow-auto p-5">
          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (q.data?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma imagem encontrada. Envie a primeira.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {q.data!.items.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { onSelect(m); onClose(); }}
                  className="group text-left border border-ink/10 hover:border-ink transition"
                >
                  <img src={m.url} alt={m.alt_text ?? ""} loading="lazy"
                    width={m.width ?? undefined} height={m.height ?? undefined}
                    className="w-full aspect-square object-cover" />
                  <p className="px-2 py-1 text-[10px] truncate text-muted-foreground">{m.original_filename}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
