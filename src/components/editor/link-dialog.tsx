import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { searchInternalLinks } from "@/lib/editorial.functions";

type LinkResult = { title: string; url: string; kind: string };

export function LinkDialog({
  open,
  initialUrl,
  onClose,
  onSubmit,
  onUnlink,
}: {
  open: boolean;
  initialUrl?: string;
  onClose: () => void;
  onSubmit: (url: string) => void;
  onUnlink?: () => void;
}) {
  const searchFn = useServerFn(searchInternalLinks);
  const [q, setQ] = useState("");
  const [url, setUrl] = useState(initialUrl ?? "");
  const [results, setResults] = useState<LinkResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setUrl(initialUrl ?? "");
      setQ("");
    }
  }, [open, initialUrl]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchFn({ data: { q } });
        if (!cancelled) setResults(r as LinkResult[]);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, open, searchFn]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-ink/40" onClick={onClose}>
      <div
        className="bg-canvas w-[560px] max-w-[92vw] border border-ink/15 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-ink/10 flex items-center justify-between">
          <h3 className="font-serif text-lg">Inserir link</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-ink text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">URL ou caminho</label>
            <input
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/bairros/alphaville ou https://…"
              className="w-full border border-ink/15 px-3 py-2 text-sm font-mono focus:outline-none focus:border-ink"
              onKeyDown={(e) => { if (e.key === "Enter" && url) onSubmit(url); }}
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Buscar página interna</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome do bairro, condomínio, imóvel, artigo…"
              className="w-full border border-ink/15 px-3 py-2 text-sm focus:outline-none focus:border-ink"
            />
            <div className="mt-2 max-h-64 overflow-y-auto border border-ink/10">
              {loading && <div className="px-3 py-2 text-xs text-muted-foreground">Buscando…</div>}
              {!loading && results.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum resultado.</div>}
              {results.map((r) => (
                <button
                  key={r.url}
                  type="button"
                  onClick={() => setUrl(r.url)}
                  className={`w-full text-left px-3 py-2 hover:bg-ink/5 border-b border-ink/5 last:border-b-0 ${url === r.url ? "bg-ink/5" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-ink">{r.title}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{r.kind}</span>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground truncate">{r.url}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-ink/10 flex items-center justify-between gap-2">
          {onUnlink ? (
            <button
              type="button"
              onClick={() => { onUnlink(); onClose(); }}
              className="text-xs uppercase tracking-widest text-red-600 hover:underline"
            >
              Remover link
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="text-xs uppercase tracking-widest px-3 py-2 border border-ink/15 hover:bg-ink/5">
              Cancelar
            </button>
            <button
              onClick={() => url && onSubmit(url)}
              disabled={!url}
              className="text-xs uppercase tracking-widest px-4 py-2 bg-ink text-canvas hover:bg-ink/85 disabled:opacity-50"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
