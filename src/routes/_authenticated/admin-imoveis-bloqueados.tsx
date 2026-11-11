import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { PropertyBlockButton } from "@/components/admin/property-block-button";
import { listBlockedProperties } from "@/lib/property-blocking.functions";

export const Route = createFileRoute("/_authenticated/admin-imoveis-bloqueados")({
  head: () => ({ meta: [
    { title: "Imóveis bloqueados — Sistema S.A Imóveis Alphaville" },
    { name: "description", content: "Gestão administrativa de imóveis removidos e bloqueados do portal S.A Imóveis Alphaville." },
    { property: "og:title", content: "Imóveis bloqueados — S.A Imóveis Alphaville" },
    { property: "og:description", content: "Controle administrativo de bloqueio e desbloqueio de imóveis." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: BlockedProperties,
});
function BlockedProperties() {
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const load = useServerFn(listBlockedProperties);
  const q = useQuery({ queryKey: ["blocked-properties", page], queryFn: () => load({ data: { page } }), retry: false });
  return <SiteLayout><main className="max-w-6xl mx-auto px-6 py-12 space-y-6">
    <Link to="/admin-mapa" className="text-sm underline">← Sistema</Link>
    <div className="flex flex-wrap items-baseline justify-between gap-4"><h1 className="font-serif text-3xl">Imóveis bloqueados</h1><span className="text-sm text-muted-foreground">{q.data?.total ?? 0} imóveis</span></div>
    {message && <p role="status" className="text-sm">{message}</p>}
    {q.isPending && <p>Carregando…</p>}
    {q.error && <p role="alert" className="text-destructive">{q.error.message}</p>}
    <div className="divide-y divide-border">
      {q.data?.rows.map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div className="min-w-0 flex-1"><Link to="/audit/$id" params={{ id: p.id }} className="font-medium underline">{p.internal_code ?? "Sem código"}</Link><p className="text-sm text-muted-foreground break-words mt-1">{p.title}</p></div>
        <PropertyBlockButton id={p.id} code={p.internal_code ?? "este imóvel"} blocked onSuccess={() => { setMessage(`${p.internal_code ?? "Imóvel"} desbloqueado; permanece pausado até a sincronização ou revisão.`); void q.refetch(); }} />
      </div>)}
    </div>
    {q.data && q.data.rows.length === 0 && <p className="text-muted-foreground">Nenhum imóvel bloqueado nesta página.</p>}
    <div className="flex items-center gap-4"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button><span className="text-sm">Página {page}</span><Button variant="outline" disabled={page * 30 >= (q.data?.total ?? 0)} onClick={() => setPage(page + 1)}>Próxima</Button></div>
  </main></SiteLayout>;
}