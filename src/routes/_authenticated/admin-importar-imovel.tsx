import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import {
  startPropertyImport, listPropertyImports, getPropertyImport, savePropertyImportDraft,
  deletePropertyImport, commitPropertyImport, searchInternalRecords, quickCreateCondominium,
  buildChecklist, type ImportDraft, type FieldMatch,
} from "@/lib/property-import.functions";

export const Route = createFileRoute("/_authenticated/admin-importar-imovel")({
  head: () => ({ meta: [{ title: "Importar imóvel por link — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ImportPage,
});

const STEPS = [
  "Acessando anúncio", "Identificando dados", "Processando endereço",
  "Processando características", "Importando imagens", "Relacionando cadastros",
  "Verificando duplicidades", "Preparando revisão",
];

const money = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function StateBadge({ state }: { state: FieldMatch["state"] }) {
  const map = {
    matched: { cls: "bg-emerald-50 text-emerald-800 border-emerald-300", icon: "✓", text: "Relacionado" },
    review: { cls: "bg-amber-50 text-amber-900 border-amber-300", icon: "!", text: "Revisão necessária" },
    missing: { cls: "bg-red-50 text-red-700 border-red-300", icon: "✕", text: "Pendência obrigatória" },
  }[state];
  return (
    <span className={`inline-flex items-center gap-1 border px-2 py-[2px] text-[10px] uppercase tracking-widest ${map.cls}`}>
      <span aria-hidden>{map.icon}</span> {map.text}
    </span>
  );
}

function ImportPage() {
  const [url, setUrl] = useState("");
  const [step, setStep] = useState(-1);
  const [importId, setImportId] = useState<string | null>(null);
  const qc = useQueryClient();

  const startFn = useServerFn(startPropertyImport);
  const listFn = useServerFn(listPropertyImports);
  const delFn = useServerFn(deletePropertyImport);

  const pendingQ = useQuery({ queryKey: ["propertyImports"], queryFn: () => listFn() });

  const startMut = useMutation({
    mutationFn: async () => {
      setStep(0);
      const timer = setInterval(() => setStep((s) => (s < STEPS.length - 2 ? s + 1 : s)), 700);
      try {
        return await startFn({ data: { url } });
      } finally {
        clearInterval(timer);
        setStep(STEPS.length - 1);
      }
    },
    onSuccess: (res) => {
      setImportId(res.id);
      qc.invalidateQueries({ queryKey: ["propertyImports"] });
    },
    onError: () => setStep(-1),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["propertyImports"] }),
  });

  if (importId) {
    return <ReviewScreen id={importId} onClose={() => { setImportId(null); setStep(-1); setUrl(""); }} />;
  }

  return (
    <SiteLayout>
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">
        <div>
          <Link to="/admin" className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-ink">← Admin</Link>
          <h1 className="font-serif text-4xl text-ink mt-3">Importar imóvel por link</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Cole o link de um anúncio. O sistema lê a página, organiza os dados no padrão da S.A. Imóveis
            e abre uma tela de revisão. Nada é salvo antes da sua conferência.
          </p>
        </div>

        <div className="space-y-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Cole aqui o link do imóvel"
            className="w-full border border-ink/15 px-4 py-3 text-sm bg-transparent focus:outline-none focus:border-ink"
          />
          <button
            onClick={() => startMut.mutate()}
            disabled={!url.trim() || startMut.isPending}
            className="bg-ink text-canvas px-5 py-3 text-xs uppercase tracking-widest font-medium hover:bg-ink/85 disabled:opacity-50"
          >
            {startMut.isPending ? "Importando…" : "Importar imóvel"}
          </button>
          {startMut.error && <p className="text-xs text-red-600">{(startMut.error as Error).message}</p>}
        </div>

        {step >= 0 && (
          <ol className="border border-ink/10 divide-y divide-ink/8">
            {STEPS.map((s, i) => (
              <li key={s} className="px-4 py-2 text-xs flex items-center justify-between">
                <span className={i <= step ? "text-ink" : "text-muted-foreground"}>{s}</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {i < step ? "concluído" : i === step ? "em andamento" : "aguardando"}
                </span>
              </li>
            ))}
          </ol>
        )}

        <section>
          <h2 className="font-serif text-2xl text-ink mb-4">Importações pendentes</h2>
          <div className="border border-ink/10">
            {(pendingQ.data ?? []).map((r) => (
              <div key={r.id} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-ink/8 text-xs items-center">
                <div className="col-span-5 truncate">
                  <div className="text-ink font-medium truncate">{r.title ?? "Sem título"}</div>
                  <div className="text-muted-foreground truncate">{r.source_url}</div>
                </div>
                <div className="col-span-2 uppercase tracking-wider text-muted-foreground">{r.status}</div>
                <div className="col-span-2 text-muted-foreground">{new Date(r.updated_at).toLocaleString("pt-BR")}</div>
                <div className="col-span-1">{r.progress}%</div>
                <div className="col-span-2 text-right space-x-3">
                  {r.status !== "committed" && (
                    <button onClick={() => setImportId(r.id)} className="uppercase tracking-widest text-ink hover:underline">Continuar</button>
                  )}
                  <button onClick={() => delMut.mutate(r.id)} className="uppercase tracking-widest text-red-600 hover:underline">Excluir</button>
                </div>
              </div>
            ))}
            {pendingQ.data?.length === 0 && (
              <div className="px-4 py-8 text-sm text-muted-foreground text-center">Nenhuma importação pendente.</div>
            )}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}

/* ------------------------------------------------------------------ */

function ReviewScreen({ id, onClose }: { id: string; onClose: () => void }) {
  const router = useRouter();
  const getFn = useServerFn(getPropertyImport);
  const saveFn = useServerFn(savePropertyImportDraft);
  const commitFn = useServerFn(commitPropertyImport);
  const searchFn = useServerFn(searchInternalRecords);
  const createCondoFn = useServerFn(quickCreateCondominium);

  const importQ = useQuery({ queryKey: ["propertyImport", id], queryFn: () => getFn({ data: { id } }) });
  const [draft, setDraft] = useState<ImportDraft | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [useExisting, setUseExisting] = useState<string | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (importQ.data?.draft && !draft) setDraft(importQ.data.draft as ImportDraft);
  }, [importQ.data, draft]);

  // Autosave da revisão
  useEffect(() => {
    if (!draft || !dirty.current) return;
    const t = setTimeout(async () => {
      const res = await saveFn({ data: { id, draft } });
      setSavedAt(res.at);
      dirty.current = false;
    }, 1200);
    return () => clearTimeout(t);
  }, [draft, id, saveFn]);

  const commitMut = useMutation({
    mutationFn: () => commitFn({ data: { id, draft: draft!, updateExistingId: useExisting } }),
    onSuccess: (res) => router.navigate({ to: "/audit/$id", params: { id: res.propertyId } }),
  });

  if (!draft) return <SiteLayout><div className="px-6 py-24 text-sm text-muted-foreground">Carregando importação…</div></SiteLayout>;

  const dup = (importQ.data?.duplicates ?? {}) as { exact?: any; similar?: any[] };
  const summary = (importQ.data?.summary ?? {}) as Record<string, number | boolean>;
  const checklist = buildChecklist(draft);
  const blocking = checklist.filter((c) => c.required && !c.ok);
  const exactBlocked = !!dup.exact && !useExisting;

  const patch = (fn: (d: ImportDraft) => ImportDraft) => {
    dirty.current = true;
    setDraft((d) => (d ? fn(structuredClone(d)) : d));
  };

  return (
    <SiteLayout>
      <div className="max-w-5xl mx-auto px-6 py-16 space-y-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <button onClick={onClose} className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-ink">← Importações</button>
            <h1 className="font-serif text-4xl text-ink mt-3">Revisar imóvel importado</h1>
            <p className="text-xs text-muted-foreground mt-2">
              {savedAt ? `Rascunho salvo às ${new Date(savedAt).toLocaleTimeString("pt-BR")}` : "Rascunho temporário — nada foi gravado no catálogo."}
            </p>
          </div>
        </div>

        {/* Resumo */}
        <div className="border border-ink/10 p-4 text-xs grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            ["Campos identificados", summary.fields_found],
            ["Relacionados", summary.auto_related],
            ["Para revisar", summary.needs_review],
            ["Não encontrados", summary.not_found],
            ["Imagens", draft.images.length],
            ["Duplicidade exata", dup.exact ? "sim" : "não"],
          ].map(([label, value]) => (
            <div key={label as string}>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
              <div className="font-serif text-xl text-ink">{String(value ?? 0)}</div>
            </div>
          ))}
        </div>

        {dup.exact && (
          <div className="border border-red-300 bg-red-50 p-4 text-sm space-y-2">
            <p className="font-medium text-red-800">Este anúncio já foi importado.</p>
            <p className="text-xs text-red-800">
              {dup.exact.internal_code ? `Código ${dup.exact.internal_code} · ` : ""}
              {[dup.exact.address, dup.exact.neighborhood, dup.exact.city].filter(Boolean).join(", ")}
            </p>
            <div className="flex gap-3">
              <Link to="/audit/$id" params={{ id: dup.exact.id }} className="text-xs uppercase tracking-widest underline">Editar imóvel existente</Link>
              <button
                onClick={() => setUseExisting(dup.exact.id)}
                className={`text-xs uppercase tracking-widest px-3 py-1 border ${useExisting ? "bg-ink text-canvas" : "border-ink"}`}
              >
                Atualizar imóvel existente com os dados desta página
              </button>
            </div>
          </div>
        )}

        {!dup.exact && (dup.similar?.length ?? 0) > 0 && (
          <div className="border border-amber-300 bg-amber-50 p-4 space-y-3">
            <p className="text-sm font-medium text-amber-900">Encontramos possíveis imóveis duplicados.</p>
            <div className="grid md:grid-cols-2 gap-3">
              {dup.similar!.map((p: any) => (
                <div key={p.id} className="border border-amber-300 bg-white p-3 text-xs flex gap-3">
                  {Array.isArray(p.images) && p.images[0] && (
                    <img src={String(p.images[0])} alt="" className="w-20 h-16 object-cover" loading="lazy" />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.title}</div>
                    <div className="text-muted-foreground truncate">{[p.condominium_name, p.neighborhood].filter(Boolean).join(" · ")}</div>
                    <div>{money(p.price_sale ?? p.price_rent)} · {p.bedrooms ?? "—"} dorm</div>
                    <button onClick={() => setUseExisting(p.id)} className="mt-1 uppercase tracking-widest underline">
                      {useExisting === p.id ? "Selecionado" : "Usar imóvel existente"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setUseExisting(null)} className="text-xs uppercase tracking-widest underline">Continuar como novo cadastro</button>
          </div>
        )}

        {/* Bloco 1 — Identificação */}
        <Block title="Identificação">
          <Field label="Finalidade">
            <select
              value={draft.identification.purpose ?? ""}
              onChange={(e) => patch((d) => { d.identification.purpose = e.target.value || null; return d; })}
              className="input"
            >
              <option value="">Selecione</option>
              <option value="sale">Venda</option>
              <option value="rent">Aluguel</option>
              <option value="both">Venda e aluguel</option>
            </select>
          </Field>
          <Field label="Tipo de imóvel">
            <select
              value={draft.identification.property_type ?? ""}
              onChange={(e) => patch((d) => { d.identification.property_type = e.target.value || null; return d; })}
              className="input"
            >
              <option value="">Selecione</option>
              {["Casa", "Apartamento", "Terreno", "Comercial", "Sala", "Galpão", "Sobrado", "Cobertura", "Flat", "Studio", "Loja", "Prédio", "Chácara", "Área", "Outros"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Título do anúncio" wide>
            <input className="input" value={draft.identification.title ?? ""}
              onChange={(e) => patch((d) => { d.identification.title = e.target.value || null; return d; })} />
          </Field>
          <Field label="Código externo">
            <input className="input" value={draft.identification.external_code ?? ""} readOnly />
          </Field>
        </Block>

        {/* Bloco 2 — Localização */}
        <Block title="Localização">
          <Field label="Estado">
            <input className="input" value={draft.location.state ?? ""}
              onChange={(e) => patch((d) => { d.location.state = e.target.value || null; return d; })} />
          </Field>
          <MatchField
            label="Cidade" kind="city" match={draft.matches.city}
            onPick={(o) => patch((d) => { d.matches.city = { ...d.matches.city, id: o.id, label: o.label, confidence: 100, state: "matched" }; return d; })}
            search={(term) => searchFn({ data: { kind: "city", term } })}
          />
          <MatchField
            label="Bairro" kind="neighborhood" match={draft.matches.neighborhood}
            onPick={(o) => patch((d) => { d.matches.neighborhood = { ...d.matches.neighborhood, id: o.id, label: o.label, confidence: 100, state: "matched" }; return d; })}
            search={(term) => searchFn({ data: { kind: "neighborhood", term } })}
          />
          <MatchField
            label="Rua" kind="street" match={draft.matches.street}
            onPick={(o) => patch((d) => { d.matches.street = { ...d.matches.street, id: o.id, label: o.label, confidence: 100, state: "matched" }; return d; })}
            search={(term) => searchFn({ data: { kind: "street", term } })}
          />
          <Field label="Número">
            <input className="input" value={draft.location.number ?? ""}
              onChange={(e) => patch((d) => { d.location.number = e.target.value || null; return d; })} />
          </Field>
          <Field label="CEP">
            <input className="input" value={draft.location.postal_code ?? ""}
              onChange={(e) => patch((d) => { d.location.postal_code = e.target.value || null; return d; })} />
          </Field>
          <MatchField
            label="Condomínio" kind="condominium" match={draft.matches.condominium}
            onPick={(o) => patch((d) => { d.matches.condominium = { ...d.matches.condominium, id: o.id, label: o.label, confidence: 100, state: "matched" }; return d; })}
            search={(term) => searchFn({ data: { kind: "condominium", term } })}
            onCreate={async () => {
              const name = draft.matches.condominium.text ?? "";
              const created = await createCondoFn({
                data: { name, neighborhood: draft.matches.neighborhood.label, city: draft.matches.city.label },
              });
              patch((d) => {
                d.matches.condominium = { ...d.matches.condominium, id: created.id, label: created.label, confidence: 100, state: "matched" };
                return d;
              });
            }}
          />
        </Block>

        {/* Bloco 3 — Valores */}
        <Block title="Valores">
          {([
            ["price_sale", "Venda"], ["price_rent", "Aluguel"],
            ["condo_fee", "Condomínio"], ["iptu", "IPTU"],
          ] as const).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                className="input" inputMode="decimal"
                value={draft.prices[key] ?? ""}
                onChange={(e) => patch((d) => {
                  const v = e.target.value.replace(",", ".");
                  d.prices[key] = v === "" ? null : Number(v);
                  return d;
                })}
              />
              <span className="text-[10px] text-muted-foreground">{money(draft.prices[key])}</span>
            </Field>
          ))}
        </Block>

        {/* Bloco 4 — Características */}
        <Block title="Características">
          {([
            ["area_total", "Área total (m²)"], ["area_built", "Área construída (m²)"],
            ["area_useful", "Área útil (m²)"], ["area_land", "Área do terreno (m²)"],
            ["bedrooms", "Dormitórios"], ["suites", "Suítes"], ["bathrooms", "Banheiros"],
            ["lavabos", "Lavabos"], ["parking", "Vagas"],
          ] as const).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                className="input" inputMode="decimal"
                value={(draft.characteristics as any)[key] ?? ""}
                onChange={(e) => patch((d) => {
                  const v = e.target.value.replace(",", ".");
                  (d.characteristics as any)[key] = v === "" ? null : Number(v);
                  return d;
                })}
              />
            </Field>
          ))}
          <div className="col-span-full space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Características do imóvel</p>
            <div className="flex flex-wrap gap-2">
              {draft.characteristics.features.map((f) => (
                <span key={f} className="border border-ink/15 px-2 py-1 text-xs">{f}</span>
              ))}
              {!draft.characteristics.features.length && <span className="text-xs text-muted-foreground">Nenhuma identificada.</span>}
            </div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-3">Características do condomínio</p>
            <div className="flex flex-wrap gap-2">
              {draft.characteristics.condo_features.map((f) => (
                <span key={f} className="border border-ink/15 px-2 py-1 text-xs">{f}</span>
              ))}
              {!draft.characteristics.condo_features.length && <span className="text-xs text-muted-foreground">Nenhuma identificada.</span>}
            </div>
            {draft.characteristics.unknown_features.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-widest text-amber-800 mt-3">Características encontradas sem relacionamento</p>
                <div className="flex flex-wrap gap-2">
                  {draft.characteristics.unknown_features.map((f) => (
                    <span key={f} className="border border-amber-300 bg-amber-50 px-2 py-1 text-xs">{f}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </Block>

        {/* Bloco 5 — Descrição */}
        <Block title="Descrição" single>
          <textarea
            className="w-full border border-ink/15 px-3 py-2 text-sm bg-transparent min-h-[220px] focus:outline-none focus:border-ink"
            value={draft.description.text ?? ""}
            onChange={(e) => patch((d) => { d.description.text = e.target.value || null; return d; })}
          />
        </Block>

        {/* Bloco 6 — Fotos */}
        <Block title={`Fotos (${draft.images.length})`} single>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {draft.images.map((src, i) => (
              <div key={src} className={`border ${i === draft.cover_index ? "border-ink" : "border-ink/10"} p-1 space-y-1`}>
                <img src={src} alt="" className="w-full aspect-[16/9] object-cover" loading="lazy" />
                <div className="flex justify-between text-[10px] uppercase tracking-widest">
                  <button onClick={() => patch((d) => { d.cover_index = i; return d; })} className="hover:underline">
                    {i === draft.cover_index ? "Principal" : "Tornar principal"}
                  </button>
                  <span className="space-x-2">
                    {i > 0 && (
                      <button onClick={() => patch((d) => {
                        const [img] = d.images.splice(i, 1); d.images.splice(i - 1, 0, img); return d;
                      })} className="hover:underline">←</button>
                    )}
                    <button onClick={() => patch((d) => {
                      d.images.splice(i, 1);
                      if (d.cover_index >= d.images.length) d.cover_index = 0;
                      return d;
                    })} className="text-red-600 hover:underline">Excluir</button>
                  </span>
                </div>
              </div>
            ))}
            {!draft.images.length && <p className="text-sm text-muted-foreground">Nenhuma imagem importada.</p>}
          </div>
        </Block>

        {/* Bloco 7 — Origem */}
        <Block title="Origem">
          <Field label="Origem da importação"><input className="input" value={draft.source.label} readOnly /></Field>
          <Field label="URL de origem" wide><input className="input" value={draft.source.url} readOnly /></Field>
          <Field label="Código original"><input className="input" value={draft.source.external_code ?? "—"} readOnly /></Field>
          <Field label="Data da leitura"><input className="input" value={new Date(draft.source.imported_at).toLocaleString("pt-BR")} readOnly /></Field>
        </Block>

        {/* Checklist */}
        <section className="border border-ink/10 p-4">
          <h2 className="font-serif text-xl text-ink mb-3">Validação do imóvel</h2>
          <ul className="text-sm space-y-1">
            {checklist.map((c) => (
              <li key={c.key} className="flex items-center gap-2">
                <span aria-hidden className={c.ok ? "text-emerald-700" : c.required ? "text-red-600" : "text-amber-700"}>
                  {c.ok ? "✓" : c.required ? "✕" : "!"}
                </span>
                <span className={c.ok ? "text-ink" : "text-muted-foreground"}>{c.label}</span>
                {!c.ok && <span className="text-[10px] uppercase tracking-widest text-muted-foreground">({c.required ? "obrigatório" : "opcional"})</span>}
              </li>
            ))}
          </ul>
          {blocking.length > 0 && (
            <p className="mt-3 text-xs text-red-600">Existem campos que precisam ser corrigidos antes de salvar.</p>
          )}
        </section>

        <div className="flex items-center gap-4">
          <button
            onClick={() => commitMut.mutate()}
            disabled={blocking.length > 0 || exactBlocked || commitMut.isPending}
            className="bg-ink text-canvas px-6 py-3 text-xs uppercase tracking-widest font-medium hover:bg-ink/85 disabled:opacity-40"
          >
            {commitMut.isPending ? "Salvando…" : useExisting ? "Atualizar imóvel existente" : "Salvar imóvel"}
          </button>
          {commitMut.error && <p className="text-xs text-red-600">{(commitMut.error as Error).message}</p>}
        </div>
      </div>
    </SiteLayout>
  );
}

/* ------------------------------------------------------------------ */

function Block({ title, children, single }: { title: string; children: React.ReactNode; single?: boolean }) {
  return (
    <section className="border border-ink/10 p-5">
      <h2 className="font-serif text-xl text-ink mb-4">{title}</h2>
      <div className={single ? "" : "grid md:grid-cols-3 gap-4"}>{children}</div>
    </section>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block space-y-1 ${wide ? "md:col-span-2" : ""}`}>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function MatchField({
  label, match, onPick, search, onCreate,
}: {
  label: string;
  kind: string;
  match: FieldMatch;
  onPick: (o: { id: string | null; label: string }) => void;
  search: (term: string) => Promise<Array<{ id: string | null; label: string }>>;
  onCreate?: () => Promise<void>;
}) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Array<{ id: string | null; label: string }>>([]);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-1">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="border border-ink/15 p-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm text-ink truncate">{match.label ?? "Não relacionado"}</div>
            <div className="text-[10px] text-muted-foreground truncate">
              Encontrado no anúncio: {match.text ?? "—"}{match.confidence ? ` · confiança ${match.confidence}%` : ""}
            </div>
          </div>
          <StateBadge state={match.state} />
        </div>
        {match.options.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {match.options.map((o) => (
              <button key={`${o.id}-${o.label}`} onClick={() => onPick(o)}
                className="border border-ink/15 px-2 py-[2px] text-[11px] hover:bg-ink/5">
                {o.label} · {o.confidence}%
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={term} onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar cadastro interno…"
            className="flex-1 border border-ink/10 px-2 py-1 text-xs bg-transparent focus:outline-none focus:border-ink"
          />
          <button
            onClick={async () => { setBusy(true); try { setResults(await search(term)); } finally { setBusy(false); } }}
            className="text-[10px] uppercase tracking-widest border border-ink/15 px-2 hover:bg-ink/5"
          >
            {busy ? "…" : "Buscar"}
          </button>
        </div>
        {results.length > 0 && (
          <div className="max-h-32 overflow-auto border border-ink/10">
            {results.map((r) => (
              <button key={`${r.id}-${r.label}`} onClick={() => { onPick(r); setResults([]); }}
                className="block w-full text-left px-2 py-1 text-xs hover:bg-ink/5">{r.label}</button>
            ))}
          </div>
        )}
        {onCreate && match.state !== "matched" && match.text && (
          <button onClick={() => onCreate()} className="text-[10px] uppercase tracking-widest underline">
            Cadastrar condomínio “{match.text}”
          </button>
        )}
      </div>
    </div>
  );
}
