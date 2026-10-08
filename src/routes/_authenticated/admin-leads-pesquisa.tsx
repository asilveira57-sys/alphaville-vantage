import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSearchLeads } from "@/lib/search-leads.functions";

export const Route = createFileRoute("/_authenticated/admin-leads-pesquisa")({
  head: () => ({ meta: [{ title: "Leads da Pesquisa Inteligente — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(listSearchLeads);
  const { data = [], isLoading } = useQuery({ queryKey: ["search-leads"], queryFn: () => fn() });
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <Link to="/admin" className="text-xs uppercase tracking-widest text-muted-foreground">← Admin</Link>
      <h1 className="mt-3 font-serif text-3xl">Leads da Pesquisa Inteligente</h1>
      <p className="text-sm text-muted-foreground">{data.length} pesquisas salvas</p>
      {isLoading ? <p className="mt-6">Carregando…</p> : (
        <table className="mt-6 w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b">
            <th className="py-2">Data</th><th>Nome</th><th>E-mail</th><th>WhatsApp</th><th>Canal</th><th>Pesquisa</th><th>Imóveis</th>
          </tr></thead>
          <tbody>{data.map((r) => (
            <tr key={r.id} className="border-b border-ink/5 align-top">
              <td className="py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
              <td>{r.name}</td><td>{r.email ?? "—"}</td>
              <td>{r.phone ? <a className="underline" href={`https://wa.me/${r.phone}`} target="_blank" rel="noreferrer">{r.phone}</a> : "—"}</td>
              <td>{r.channel}</td>
              <td><a className="underline" href={r.search_url} target="_blank" rel="noreferrer">{r.search_query || "ver filtros"}</a></td>
              <td>{r.result_count}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
