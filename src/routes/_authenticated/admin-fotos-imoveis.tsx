import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { PropertyPhotoTools } from "@/components/admin/property-photo-tools";
import { searchPropertiesForPhotoTools } from "@/lib/property-photos.functions";

export const Route = createFileRoute("/_authenticated/admin-fotos-imoveis")({
  component: AdminFotosImoveis,
});

type Row = {
  id: string;
  slug: string;
  title: string;
  code: string;
  status: string;
  inAcervo: boolean;
  photos: number;
};

function AdminFotosImoveis() {
  const search = useServerFn(searchPropertiesForPhotoTools);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (q.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      setRows(await search({ data: { q: q.trim() } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na busca");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteLayout>
      <section className="px-6 py-10 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-serif text-2xl">Fotos dos imóveis</h1>
          <Link to="/admin" className="text-xs uppercase tracking-widest underline">← Admin</Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Busque pelo código, slug ou título para baixar o ZIP de fotos ou copiar as originais para o acervo.
          Fotos no acervo ficam preservadas mesmo se o imóvel sair do site principal.
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Código, slug ou título…"
            className="flex-1 rounded border border-ink/20 bg-canvas px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={busy}>{busy ? "Buscando…" : "Buscar"}</Button>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {rows && rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum imóvel encontrado.</p>}
        {rows && rows.length > 0 && (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.code || "sem código"} · {r.status === "active" ? "ativo" : r.status === "paused" ? "indisponível" : r.status} · {r.photos} fotos
                      {r.inAcervo && " · no acervo"}
                    </p>
                  </div>
                  <Link to="/imoveis/$slug" params={{ slug: r.slug }} className="text-xs underline" target="_blank">
                    Abrir ficha
                  </Link>
                </div>
                <PropertyPhotoTools propertyId={r.id} inAcervo={r.inAcervo} />
              </div>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
