import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { checkIsAdmin } from "@/lib/admin.functions";
import { getPropertyForReview, saveManualReview, reprocessProperties } from "@/lib/property-review.functions";
import { regenerateSeo } from "@/lib/property-seo.functions";

export const Route = createFileRoute("/_authenticated/audit/$id")({
  head: () => ({ meta: [{ title: "Editar imóvel — Auditoria" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AuditEditPage,
});

type Overrides = Record<string, unknown>;

const TEXT_FIELDS = [
  ["title", "Título"],
  ["property_type", "Tipo (apartamento/casa/…)"],
  ["purpose", "Finalidade (sale/rent/both)"],
  ["city", "Cidade"],
  ["state", "Estado (UF)"],
  ["neighborhood", "Bairro"],
  ["condominium_name", "Condomínio"],
  ["internal_code", "Código interno"],
] as const;

const NUM_FIELDS = [
  ["bedrooms", "Dormitórios"],
  ["suites", "Suítes"],
  ["bathrooms", "Banheiros"],
  ["lavabos", "Lavabos"],
  ["parking", "Vagas (total)"],
  ["parking_covered", "Vagas cobertas"],
  ["parking_uncovered", "Vagas descobertas"],
  ["area_useful", "Área útil (m²)"],
  ["area_built", "Área construída (m²)"],
  ["area_total", "Área total (m²)"],
] as const;

const MONEY_FIELDS = [
  ["price_sale", "Valor de venda (R$)"],
  ["price_rent", "Valor de locação (R$)"],
  ["condo_fee", "Condomínio (R$)"],
  ["iptu", "IPTU (R$)"],
] as const;


const BOOL_FIELDS = [
  ["furnished", "Mobiliado"],
  ["is_launch", "Lançamento"],
  ["accepts_exchange", "Aceita permuta"],
] as const;

function AuditEditPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const checkFn = useServerFn(checkIsAdmin);
  const loadFn = useServerFn(getPropertyForReview);
  const saveFn = useServerFn(saveManualReview);
  const reprocessFn = useServerFn(reprocessProperties);
  const seoFn = useServerFn(regenerateSeo);

  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkFn() });
  const propQ = useQuery({
    queryKey: ["propReview", id],
    queryFn: () => loadFn({ data: { id } }),
    enabled: !!adminQ.data?.isAdmin,
  });

  const [overrides, setOverrides] = useState<Overrides>({});
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (propQ.data?.manual_overrides) {
      setOverrides({ ...(propQ.data.manual_overrides as Overrides) });
    }
  }, [propQ.data?.id]);

  const saveMut = useMutation({
    mutationFn: () => saveFn({ data: { id, overrides } }),
    onSuccess: () => { setMsg("Salvo."); propQ.refetch(); },
  });
  const reprocessMut = useMutation({
    mutationFn: () => reprocessFn({ data: { id } }),
    onSuccess: () => { setMsg("Reprocessado."); propQ.refetch(); },
  });
  const seoMut = useMutation({
    mutationFn: () => seoFn({ data: { id } }),
    onSuccess: () => { setMsg("SEO regerado."); propQ.refetch(); },
  });
  const saveAndAllMut = useMutation({
    mutationFn: async () => {
      await saveFn({ data: { id, overrides } });
      await reprocessFn({ data: { id } });
      await seoFn({ data: { id } });
    },
    onSuccess: () => { setMsg("Salvo, reprocessado e SEO regerado."); propQ.refetch(); },
  });

  if (!adminQ.data?.isAdmin) {
    return <SiteLayout><div className="px-6 py-24 text-sm text-muted-foreground">Sem permissão.</div></SiteLayout>;
  }
  if (propQ.isLoading || !propQ.data) {
    return <SiteLayout><div className="px-6 py-24 text-sm text-muted-foreground">Carregando…</div></SiteLayout>;
  }

  const p = propQ.data as Record<string, unknown>;
  const issues = Array.isArray(p.audit_issues) ? (p.audit_issues as string[]) : [];
  const raw = (p.raw ?? {}) as Record<string, unknown>;

  const setField = (k: string, v: unknown) => setOverrides((o) => ({ ...o, [k]: v }));
  const clearField = (k: string) => setOverrides((o) => {
    const n = { ...o }; delete n[k]; return n;
  });
  const valueOf = (k: string): unknown => (k in overrides ? overrides[k] : p[k]);

  const pending = saveMut.isPending || reprocessMut.isPending || seoMut.isPending || saveAndAllMut.isPending;

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link to="/audit" className="text-xs uppercase tracking-widest underline">← Voltar à auditoria</Link>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => reprocessMut.mutate()}
              disabled={pending}
              className="border border-ink/20 px-3 py-2 text-xs uppercase tracking-widest hover:bg-ink/5 disabled:opacity-50"
            >Reprocessar parser</button>
            <button
              onClick={() => seoMut.mutate()}
              disabled={pending}
              className="border border-ink/20 px-3 py-2 text-xs uppercase tracking-widest hover:bg-ink/5 disabled:opacity-50"
            >Regerar SEO</button>
            <button
              onClick={() => saveMut.mutate()}
              disabled={pending}
              className="bg-ink text-canvas px-3 py-2 text-xs uppercase tracking-widest hover:bg-ink/85 disabled:opacity-50"
            >Salvar overrides</button>
            <button
              onClick={() => saveAndAllMut.mutate()}
              disabled={pending}
              className="bg-brand-yellow text-brand-dark px-3 py-2 text-xs font-bold uppercase tracking-widest hover:brightness-95 disabled:opacity-50"
            >Salvar + reprocessar + SEO</button>
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">
            {String(p.internal_code ?? "—")} · {String(p.slug ?? "—")}
          </p>
          <h1 className="font-serif text-3xl text-ink">{String(p.title ?? "—")}</h1>
          {issues.length > 0 && (
            <p className="text-xs text-red-700 mt-2">
              ⚠ {issues.length} pendência{issues.length === 1 ? "" : "s"}: {issues.join(" · ")}
            </p>
          )}
          {msg && <p className="text-xs text-emerald-700 mt-2">{msg}</p>}
          {(saveMut.error || reprocessMut.error || seoMut.error || saveAndAllMut.error) && (
            <p className="text-xs text-red-700 mt-2">
              {((saveMut.error || reprocessMut.error || seoMut.error || saveAndAllMut.error) as Error).message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1 — extraído */}
          <div className="border border-ink/10 p-4 text-xs space-y-1.5">
            <h2 className="font-serif text-base text-ink mb-3">Extraído (parser)</h2>
            {[...TEXT_FIELDS, ...NUM_FIELDS].map(([k, label]) => (
              <div key={k} className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-ink truncate">{String(p[k] ?? "—")}</span>
              </div>
            ))}
            {BOOL_FIELDS.map(([k, label]) => (
              <div key={k} className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-ink">{p[k] === true ? "sim" : p[k] === false ? "não" : "—"}</span>
              </div>
            ))}
          </div>

          {/* Coluna 2 — editável */}
          <div className="border border-ink/10 p-4 text-xs space-y-3">
            <h2 className="font-serif text-base text-ink mb-3">Editável (overrides)</h2>
            {TEXT_FIELDS.map(([k, label]) => (
              <FieldRow key={k} k={k} label={label} overridden={k in overrides} onClear={() => clearField(k)}>
                <input
                  type="text"
                  value={String(valueOf(k) ?? "")}
                  onChange={(e) => setField(k, e.target.value || null)}
                  className="w-full border border-ink/20 px-2 py-1 bg-transparent"
                />
              </FieldRow>
            ))}
            {NUM_FIELDS.map(([k, label]) => (
              <FieldRow key={k} k={k} label={label} overridden={k in overrides} onClear={() => clearField(k)}>
                <input
                  type="number"
                  step="any"
                  value={valueOf(k) == null ? "" : String(valueOf(k))}
                  onChange={(e) => setField(k, e.target.value === "" ? null : Number(e.target.value))}
                  className="w-full border border-ink/20 px-2 py-1 bg-transparent"
                />
              </FieldRow>
            ))}
            {MONEY_FIELDS.map(([k, label]) => (
              <FieldRow key={k} k={k} label={label} overridden={k in overrides} onClear={() => clearField(k)}>
                <MoneyInput
                  value={valueOf(k) as number | null}
                  onChange={(v) => setField(k, v)}
                  className="w-full border border-ink/20 px-2 py-1"
                />
              </FieldRow>
            ))}

            {BOOL_FIELDS.map(([k, label]) => (
              <FieldRow key={k} k={k} label={label} overridden={k in overrides} onClear={() => clearField(k)}>
                <select
                  value={valueOf(k) == null ? "" : valueOf(k) ? "true" : "false"}
                  onChange={(e) => setField(k, e.target.value === "" ? null : e.target.value === "true")}
                  className="w-full border border-ink/20 px-2 py-1 bg-transparent"
                >
                  <option value="">—</option>
                  <option value="true">sim</option>
                  <option value="false">não</option>
                </select>
              </FieldRow>
            ))}
          </div>

          {/* Coluna 3 — raw */}
          <div className="border border-ink/10 p-4 text-xs space-y-3">
            <h2 className="font-serif text-base text-ink mb-3">Raw / origem</h2>
            <div>
              <div className="text-muted-foreground mb-1">URL origem</div>
              <a href={String(p.source_url ?? "")} target="_blank" rel="noreferrer" className="text-ink underline break-all">
                {String(p.source_url ?? "—")}
              </a>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Descrição original</div>
              <pre className="whitespace-pre-wrap bg-ink/5 p-2 max-h-64 overflow-auto">{String(p.descricao_original ?? p.description ?? "—")}</pre>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">raw.html_excerpt</div>
              <pre className="whitespace-pre-wrap bg-ink/5 p-2 max-h-64 overflow-auto">{String(raw.html_excerpt ?? "—")}</pre>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">raw.body_excerpt</div>
              <pre className="whitespace-pre-wrap bg-ink/5 p-2 max-h-64 overflow-auto">{String(raw.body_excerpt ?? "—")}</pre>
            </div>
          </div>
        </div>

        <div className="border border-ink/10 p-4">
          <h2 className="font-serif text-base text-ink mb-3">Descrição SEO atual</h2>
          <pre className="whitespace-pre-wrap text-sm text-ink">{String(p.descricao_seo ?? "—")}</pre>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">SEO title</div>
              <div className="text-ink">{String(p.seo_title ?? "—")}</div>
            </div>
            <div>
              <div className="text-muted-foreground">SEO description</div>
              <div className="text-ink">{String(p.seo_description ?? "—")}</div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

function FieldRow({
  label, children, overridden, onClear,
}: { k: string; label: string; children: React.ReactNode; overridden: boolean; onClear: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-muted-foreground">{label}{overridden && <span className="ml-1 text-brand-yellow">●</span>}</span>
        {overridden && (
          <button type="button" onClick={onClear} className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-ink">
            limpar
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
