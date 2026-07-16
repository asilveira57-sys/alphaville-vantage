import { useEffect, useRef, useState } from "react";
import { uploadEditorialImageFile } from "@/components/image-upload";

export type ImagePayload = { src: string; alt: string; caption?: string };

export function ImageDialog({
  open,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial?: Partial<ImagePayload>;
  onClose: () => void;
  onSubmit: (p: ImagePayload) => void;
}) {
  const [src, setSrc] = useState(initial?.src ?? "");
  const [alt, setAlt] = useState(initial?.alt ?? "");
  const [caption, setCaption] = useState(initial?.caption ?? "");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSrc(initial?.src ?? "");
      setAlt(initial?.alt ?? "");
      setCaption(initial?.caption ?? "");
      setErr(null);
    }
  }, [open, initial?.src, initial?.alt, initial?.caption]);

  if (!open) return null;

  async function pickFile(f: File) {
    setUploading(true); setErr(null);
    try {
      const url = await uploadEditorialImageFile(f, "content");
      setSrc(url);
      if (!alt) setAlt(f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function submit() {
    if (!src) { setErr("Selecione uma imagem ou informe uma URL."); return; }
    if (!alt.trim()) { setErr("O texto alternativo (alt) é obrigatório para acessibilidade e SEO."); return; }
    onSubmit({ src, alt: alt.trim(), caption: caption.trim() || undefined });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-ink/40" onClick={onClose}>
      <div className="bg-canvas w-[600px] max-w-[92vw] border border-ink/15 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-ink/10 flex items-center justify-between">
          <h3 className="font-serif text-lg">Inserir imagem</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          {src && (
            <div className="border border-ink/10 p-2 bg-ink/[0.02]">
              <img src={src} alt={alt || "preview"} className="max-h-48 mx-auto object-contain" />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-xs uppercase tracking-widest px-4 py-2 border border-ink/15 hover:bg-ink/5 disabled:opacity-50"
            >
              {uploading ? "Enviando…" : (src ? "Trocar arquivo" : "Enviar arquivo")}
            </button>
            <input
              ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void pickFile(f); }}
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">URL da imagem</label>
            <input
              value={src}
              onChange={(e) => setSrc(e.target.value)}
              placeholder="https://…"
              className="w-full border border-ink/15 px-3 py-2 text-sm font-mono focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Texto alternativo (alt) <span className="text-red-600">*</span>
            </label>
            <input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Descreva a imagem para leitores de tela e SEO"
              className="w-full border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Legenda (opcional)</label>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ex.: Vista aérea de Alphaville, 2025."
              className="w-full border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:border-ink"
            />
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
        </div>
        <div className="px-5 py-3 border-t border-ink/10 flex justify-end gap-2">
          <button onClick={onClose} className="text-xs uppercase tracking-widest px-3 py-2 border border-ink/15 hover:bg-ink/5">
            Cancelar
          </button>
          <button
            onClick={submit}
            className="text-xs uppercase tracking-widest px-4 py-2 bg-ink text-canvas hover:bg-ink/85"
          >
            {initial?.src ? "Atualizar" : "Inserir"}
          </button>
        </div>
      </div>
    </div>
  );
}
