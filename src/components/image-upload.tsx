import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  value?: string;
  onUploaded: (url: string) => void;
  folder?: string;
  label?: string;
  className?: string;
};

function publicUrlFor(path: string) {
  return `/api/public/editorial-image/${path}`;
}

export async function uploadEditorialImageFile(file: File, folder = "uploads"): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const path = `${folder}/${id}.${ext}`;
  const { error } = await supabase.storage.from("editorial-images").upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return publicUrlFor(path);
}

export function ImageUpload({ value, onUploaded, folder = "uploads", label = "Imagem", className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    setBusy(true); setErr(null);
    try {
      const url = await uploadEditorialImageFile(file, folder);
      onUploaded(url);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="" className="h-16 w-16 object-cover border border-ink/15" />
        ) : (
          <div className="h-16 w-16 border border-dashed border-ink/20 flex items-center justify-center text-[10px] text-muted-foreground">
            sem imagem
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="text-xs uppercase tracking-widest border border-ink/20 px-3 py-1.5 hover:bg-ink/5 disabled:opacity-50"
          >
            {busy ? "Enviando…" : value ? "Trocar" : `Enviar ${label}`}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onUploaded("")}
              className="text-xs uppercase tracking-widest border border-ink/20 px-3 py-1.5 hover:bg-ink/5"
            >
              Remover
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      {err && <p className="mt-1 text-[11px] text-red-600">{err}</p>}
    </div>
  );
}

export function ImageGalleryUpload({
  value,
  onChange,
  folder = "gallery",
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(true); setErr(null);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        urls.push(await uploadEditorialImageFile(f, folder));
      }
      onChange([...value, ...urls]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((url, i) => (
          <div key={url + i} className="relative group">
            <img src={url} alt="" className="h-20 w-20 object-cover border border-ink/15" />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="absolute -top-2 -right-2 bg-ink text-canvas w-5 h-5 text-xs leading-none opacity-0 group-hover:opacity-100"
              aria-label="Remover"
            >×</button>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="text-xs uppercase tracking-widest border border-ink/20 px-3 py-1.5 hover:bg-ink/5 disabled:opacity-50"
      >
        {busy ? "Enviando…" : "Adicionar imagens"}
      </button>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => handleFiles(e.target.files)} />
      {err && <p className="mt-1 text-[11px] text-red-600">{err}</p>}
    </div>
  );
}
