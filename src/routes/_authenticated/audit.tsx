import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { checkIsAdmin } from "@/lib/admin.functions";
import { getScrapAudit, listAuditProperties } from "@/lib/property-review.functions";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Auditoria SEO — Portal S.A" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AuditPage,
});

type StatusFilter = "all" | "ok" | "review" | "error";
type IssueFilter = "" | "missing_condo" | "missing_city" | "missing_area" | "missing_bedrooms" | "missing_price" | "rent_suspect" | "ratio_off";

function AuditPage() {
  const checkFn = useServerFn(checkIsAdmin);
  const auditFn = useServerFn(getScrapAudit);
  const listFn = useServerFn(listAuditProperties);
  const [status, setStatus] = useState<StatusFilter>("review");
  const [filter, setFilter] = useState<IssueFilter>("");

  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkFn() });
  const statsQ = useQuery({ queryKey: ["scrapAudit"], queryFn: () => auditFn(), enabled: !!adminQ.data?.isAdmin });
  const listQ = useQuery({
    queryKey: ["auditList", status, filter],
    queryFn: () => listFn({ data: { status, filter: filter || null, limit: 200 } }),
    enabled: !!adminQ.data?.isAdmin,
  });

  if (!adminQ.data?.isAdmin) {
    return <SiteLayout><div className="px-6 py-24 text-sm text-muted-foreground">Sem permissão.</div></SiteLayout>;
  }

  const stats = statsQ.data;
  const items = listQ.data ?? [];

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Administração</p>
            <h1 className="font-serif text-3xl text-ink">Auditoria SEO de imóveis</h1>
          </div>
          <Link to="/_authenticated/admin" className="text-xs uppercase tracking-widest underline">← Painel</Link>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <Card label="Total" value={stats.total} />
            <Card label="✓ OK" value={stats.auditOk} tone="ok" />
            <Card label="⚠ Revisar" value={stats.auditReview} tone="warn" />
            <Card label="✗ Erro" value={stats.auditError} tone="err" />
            <Card label="Qualidade" value={`${stats.qualityPct}%`} tone={stats.qualityPct >= 95 ? "ok" : stats.qualityPct >= 80 ? "warn" : "err"} />
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-center text-xs">
          <span className="uppercase tracking-widest text-muted-foreground">Status:</span>
          {(["all", "ok", "review", "error"] as StatusFilter[]).map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1 border ${status === s ? "border-ink bg-ink text-canvas" : "border-ink/20 hover:border-ink"}`}>
              {s === "all" ? "Todos" : s === "ok" ? "✓ OK" : s === "review" ? "⚠ Revisar" : "✗ Erro"}
            </button>
          ))}
          <span className="uppercase tracking-widest text-muted-foreground ml-4">Falta:</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value as IssueFilter)} className="border border-ink/20 px-2 py-1 bg-transparent">
            <option value="">— qualquer —</option>
            <option value="missing_condo">Sem condomínio</option>
            <option value="missing_city">Sem cidade</option>
            <option value="missing_area">Sem metragem</option>
            <option value="missing_bedrooms">Sem dormitórios</option>
            <option value="missing_price">Sem valor</option>
          </select>
          <span className="ml-auto text-muted-foreground">{items.length} imóveis</span>
        </div>

        <div className="border border-ink/10 divide-y divide-ink/10">
          {items.map((it) => {
            const issues = Array.isArray(it.audit_issues) ? (it.audit_issues as unknown as string[]) : [];
            const badge = it.audit_status === "ok" ? "✓" : it.audit_status === "review" ? "⚠" : it.audit_status === "error" ? "✗" : "·";
            return (
              <div key={it.id} className="p-4 grid md:grid-cols-12 gap-3 text-xs">
                <div className="md:col-span-4">
                  <div className="flex gap-2 items-baseline">
                    <span className="font-mono">{badge}</span>
                    <Link to="/imoveis/$slug" params={{ slug: it.slug ?? "" }} className="text-ink hover:underline font-medium">
                      {it.title ?? it.slug}
                    </Link>
                  </div>
                  <div className="text-muted-foreground mt-1">
                    {it.internal_code ?? "—"} · {it.condominium_name ?? "sem condomínio"} · {it.city ?? "sem cidade"}
                  </div>
                </div>
                <div className="md:col-span-3 text-muted-foreground">
                  <div>Dorm: {it.bedrooms ?? "—"} · Suítes: {it.suites ?? "—"} · Banh: {it.bathrooms ?? "—"} · Lav: {it.lavabos ?? "—"}</div>
                  <div>Vagas: {it.parking ?? "—"}{(it.parking_covered || it.parking_uncovered) ? ` (${it.parking_covered ?? 0}c+${it.parking_uncovered ?? 0}d)` : ""}</div>
                  <div>Área U/C/T: {it.area_useful ?? "—"}/{it.area_built ?? "—"}/{it.area_total ?? "—"} m²</div>
                </div>
                <div className="md:col-span-2 text-muted-foreground">
                  {it.price_rent ? <div>Loc: R$ {Number(it.price_rent).toLocaleString("pt-BR")}</div> : null}
                  {it.price_sale ? <div>Venda: R$ {Number(it.price_sale).toLocaleString("pt-BR")}</div> : null}
                </div>
                <div className="md:col-span-3 flex flex-col gap-2">
                  {issues.length === 0 ? (
                    <span className="text-emerald-700">Sem pendências</span>
                  ) : (
                    <ul className="space-y-0.5 text-red-700">
                      {issues.map((iss, i) => (<li key={i}>• {iss}</li>))}
                    </ul>
                  )}
                  <Link
                    to="/_authenticated/audit/$id"
                    params={{ id: it.id }}
                    className="self-start text-[10px] uppercase tracking-widest border border-ink/30 px-2 py-1 hover:bg-ink hover:text-canvas"
                  >Editar →</Link>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhum imóvel com os filtros selecionados.</div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}

function Card({ label, value, tone }: { label: string; value: number | string; tone?: "ok" | "warn" | "err" }) {
  const color = tone === "ok" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : tone === "err" ? "text-red-700" : "text-ink";
  return (
    <div className="border border-ink/10 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-serif text-2xl ${color}`}>{value}</div>
    </div>
  );
}
