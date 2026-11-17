import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { resized, onImgFallback } from "@/lib/img-resize";
import { uploadToLibrary } from "@/lib/media-upload";
import { bboxFor, computeNearby, fetchPois, type Poi } from "@/lib/condo-nearby";
import {
  listCondoDetailsAdmin, getCondoDetailsAdmin, saveCondoDetails, saveCondoNearby,
  type CondoAdminRow, type CondoNearby,
} from "@/lib/condo-details.functions";

export const Route = createFileRoute("/_authenticated/admin-condominios-ficha")({
  head: () => ({ meta: [
    { title: "Ficha dos condomínios — Admin S.A Imóveis" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  component: AdminCondoFicha,
});

const COMMON_AMENITIES = [
  "Piscina", "Piscina aquecida", "Piscina infantil", "Academia", "Spa", "Sauna", "Espaço gourmet", "Churrasqueira",
  "Salão de festas", "Salão de jogos", "Brinquedoteca", "Playground", "Quadra poliesportiva", "Quadra de tênis",
  "Quadra de beach tennis", "Campo de futebol", "Pista de caminhada", "Ciclovia", "Lago", "Área verde", "Pet place",
  "Coworking", "Lavanderia", "Bicicletário", "Clube", "Portaria 24 horas", "Segurança 24 horas", "Elevadores",
  "Depósito privativo", "Gerador", "Carregador para carro elétrico",
];

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
const strOrNull = (v: string) => (v.trim() === "" ? null : v.trim());

function AdminCondoFicha() {
  const list = useServerFn(listCondoDetailsAdmin);
  const [rows, setRows] = useState<CondoAdminRow[] | null>(null);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const reload = () => list().then(setRows).catch((e) => setErr((e as Error).message));
  useEffect(() => { reload(); }, []);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => !t || r.name.toLowerCase().includes(t));
  }, [rows, q]);

  return (
    <SiteLayout>
      <section className="px-6 py-10 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl">Ficha dos condomínios</h1>
            <p className="text-sm text-muted-foreground">Fotos, lazer, ficha técnica, localização, proximidades e perguntas da página pública de cada condomínio.</p>
          </div>
          <Link to="/admin" className="text-xs uppercase tracking-widest underline">← Admin</Link>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        {sel ? (
          <Editor id={sel} onClose={() => { setSel(null); reload(); }} />
        ) : (
          <>
            <BatchNearby rows={rows ?? []} onDone={reload} />
            <Input placeholder="Buscar condomínio…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
            {!rows ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
              <div className="overflow-x-auto border border-ink/10">
                <table className="w-full text-sm">
                  <thead className="bg-ink/[0.03] text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr><th className="p-2">Condomínio</th><th className="p-2 text-right">Ativos</th><th className="p-2">Ficha</th><th className="p-2 text-right">Lazer</th><th className="p-2 text-right">Fotos</th><th className="p-2 text-right">Proximidades</th><th className="p-2 text-right">FAQ</th><th className="p-2" /></tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.id} className="border-t border-ink/8 hover:bg-ink/[0.02]">
                        <td className="p-2 font-medium">{r.name}{r.status !== "published" && <span className="ml-2 text-[10px] uppercase text-muted-foreground">{r.status}</span>}</td>
                        <td className="p-2 text-right tabular-nums">{r.active}</td>
                        <td className="p-2">{r.hasFacts ? "✓" : "—"}</td>
                        <td className={`p-2 text-right tabular-nums ${r.amenities ? "" : "text-red-600"}`}>{r.amenities}</td>
                        <td className={`p-2 text-right tabular-nums ${r.photos ? "" : "text-red-600"}`}>{r.photos}</td>
                        <td className={`p-2 text-right tabular-nums ${r.nearby ? "" : "text-red-600"}`}>{r.nearby}</td>
                        <td className="p-2 text-right tabular-nums">{r.faq}</td>
                        <td className="p-2 text-right"><button className="underline text-xs" onClick={() => setSel(r.id)}>Editar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </SiteLayout>
  );
}

/** Calcula proximidades de todos que ainda não têm (roda neste navegador, ~1 condomínio por segundo). */
function BatchNearby({ rows, onDone }: { rows: CondoAdminRow[]; onDone: () => void }) {
  const save = useServerFn(saveCondoNearby);
  const [state, setState] = useState<string | null>(null);
  const stop = useRef(false);
  const todo = rows.filter((r) => !r.nearby && r.lat != null && r.lng != null);
  const run = async () => {
    stop.current = false;
    try {
      setState("Baixando locais do OpenStreetMap…");
      const pois = await fetchPois(bboxFor(todo.map((r) => [r.lat!, r.lng!])));
      let ok = 0, fail = 0;
      for (const [i, r] of todo.entries()) {
        if (stop.current) break;
        setState(`${i + 1}/${todo.length} · ${r.name}`);
        try {
          const nearby = await computeNearby(r.lat!, r.lng!, pois);
          await save({ data: { id: r.id, nearby } });
          ok++;
        } catch { fail++; }
        await new Promise((res) => setTimeout(res, 1100));
      }
      setState(`Pronto: ${ok} calculados${fail ? `, ${fail} com erro (rode de novo)` : ""}.`);
      onDone();
    } catch (e) { setState("Erro: " + (e as Error).message); }
  };
  if (!rows.length) return null;
  return (
    <div className="border border-ink/10 p-4 flex flex-wrap items-center gap-3 text-sm">
      <span><b>{todo.length}</b> condomínios sem tabela de proximidades.</span>
      {todo.length > 0 && <Button size="sm" onClick={run} disabled={!!state && !state.startsWith("Pronto") && !state.startsWith("Erro")}>Calcular proximidades</Button>}
      {state && !state.startsWith("Pronto") && !state.startsWith("Erro") && <Button size="sm" variant="outline" onClick={() => { stop.current = true; }}>Parar</Button>}
      {state && <span className="text-muted-foreground">{state}</span>}
    </div>
  );
}

type Photo = { url: string; alt?: string | null };
type Faq = { question: string; answer: string };

function Editor({ id, onClose }: { id: string; onClose: () => void }) {
  const get = useServerFn(getCondoDetailsAdmin);
  const save = useServerFn(saveCondoDetails);
  const saveNear = useServerFn(saveCondoNearby);
  const [c, setC] = useState<Record<string, any> | null>(null);
  const [listing, setListing] = useState<Array<{ code: string; url: string }>>([]);
  const [f, setF] = useState<Record<string, string>>({});
  const [amen, setAmen] = useState<string[]>([]);
  const [gallery, setGallery] = useState<Photo[]>([]);
  const [faq, setFaq] = useState<Faq[]>([]);
  const [nearby, setNearby] = useState<CondoNearby[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showListing, setShowListing] = useState(false);
  const poisRef = useRef<Poi[] | null>(null);

  useEffect(() => {
    get({ data: { id } }).then(({ condo, listingPhotos }) => {
      setC(condo); setListing(listingPhotos);
      const s = (k: string) => (condo[k] == null ? "" : String(condo[k]));
      setF({ official_name: s("official_name"), address: s("address"), postal_code: s("postal_code"), developer: s("developer"), year_built: s("year_built"), towers: s("towers"), floors: s("floors"), units_count: s("units_count"), lat: s("lat"), lng: s("lng"), details_sources: s("details_sources") });
      setAmen(condo.amenities ?? []); setGallery(condo.gallery ?? []); setFaq(condo.faq ?? []); setNearby(condo.nearby ?? []);
    }).catch((e) => setMsg((e as Error).message));
  }, [id]);

  if (!c) return <p className="text-sm text-muted-foreground">{msg ?? "Carregando…"}</p>;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((o) => ({ ...o, [k]: e.target.value }));
  const field = (k: string, label: string, ph = "") => (
    <label className="block text-xs text-muted-foreground">{label}<Input value={f[k] ?? ""} onChange={set(k)} placeholder={ph} className="mt-1 text-sm text-ink" /></label>
  );

  const doSave = async () => {
    setBusy(true); setMsg(null);
    try {
      await save({ data: {
        id, official_name: strOrNull(f.official_name ?? ""), address: strOrNull(f.address ?? ""), postal_code: strOrNull(f.postal_code ?? ""),
        developer: strOrNull(f.developer ?? ""), year_built: numOrNull(f.year_built ?? ""), towers: numOrNull(f.towers ?? ""),
        floors: numOrNull(f.floors ?? ""), units_count: numOrNull(f.units_count ?? ""), lat: numOrNull(f.lat ?? ""), lng: numOrNull(f.lng ?? ""),
        amenities: amen.map((a) => a.trim()).filter(Boolean), gallery, faq: faq.filter((x) => x.question.trim() && x.answer.trim()),
        details_sources: strOrNull(f.details_sources ?? ""),
      } });
      setMsg("Salvo. A página pública já mostra as mudanças.");
    } catch (e) { setMsg("Erro: " + (e as Error).message); } finally { setBusy(false); }
  };

  const recalc = async () => {
    const lat = numOrNull(f.lat ?? ""), lng = numOrNull(f.lng ?? "");
    if (lat == null || lng == null) { setMsg("Preencha latitude e longitude antes."); return; }
    setBusy(true); setMsg("Calculando proximidades…");
    try {
      poisRef.current ??= await fetchPois(bboxFor([[lat, lng]]));
      const n = await computeNearby(lat, lng, poisRef.current);
      await saveNear({ data: { id, nearby: n } });
      setNearby(n); setMsg(`Proximidades salvas (${n.length} locais).`);
    } catch (e) { setMsg("Erro: " + (e as Error).message); } finally { setBusy(false); }
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setMsg("Enviando fotos…");
    try {
      const added: Photo[] = [];
      for (const file of Array.from(files)) {
        const m = await uploadToLibrary(file, { folder: "condominios", alt: `${c.name} — área comum` });
        added.push({ url: m.url, alt: `${c.name} — área comum` });
      }
      setGallery((g) => [...g, ...added]); setMsg(`${added.length} foto(s) enviada(s). Clique em Salvar.`);
    } catch (e) { setMsg("Erro no envio: " + (e as Error).message); } finally { setBusy(false); }
  };
  const move = (i: number, d: number) => setGallery((g) => { const a = [...g]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j]!, a[i]!]; return a; });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onClose} className="text-xs uppercase tracking-widest underline">← Lista</button>
        <h2 className="font-serif text-2xl">{c.name}</h2>
        <a href={`/condominios/${c.slug}`} target="_blank" rel="noopener" className="text-xs underline">Ver página ↗</a>
        <div className="ml-auto flex items-center gap-3">
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
          <Button onClick={doSave} disabled={busy}>Salvar</Button>
        </div>
      </div>

      <Block title="Ficha técnica">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {field("official_name", "Nome comercial", "Ex.: Bellagio Ecopark Alphaville")}
          {field("address", "Endereço (com número)", "Rua Bonnard, 157")}
          {field("postal_code", "CEP")}
          {field("developer", "Construtora / incorporadora")}
          {field("year_built", "Ano de entrega")}
          {field("towers", "Torres")}
          {field("floors", "Andares")}
          {field("units_count", "Unidades")}
          {field("lat", "Latitude", "-23.48")}
          {field("lng", "Longitude", "-46.87")}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Dica: no Google Maps, clique com o botão direito em cima do prédio e copie os números (o primeiro é a latitude). Metragens, dormitórios e vagas são calculados dos anúncios ativos.</p>
        <label className="block text-xs text-muted-foreground mt-3">Fontes dos dados (uso interno)<Textarea value={f.details_sources ?? ""} onChange={set("details_sources")} rows={2} className="mt-1 text-sm text-ink" /></label>
      </Block>

      <Block title={`Lazer e comodidades (${amen.length})`}>
        <Textarea value={amen.join("\n")} onChange={(e) => setAmen(e.target.value.split("\n"))} rows={8} className="text-sm" placeholder="Um item por linha" />
        <div className="flex flex-wrap gap-1.5 mt-3">
          {COMMON_AMENITIES.filter((a) => !amen.includes(a)).map((a) => (
            <button key={a} type="button" onClick={() => setAmen((x) => [...x.filter(Boolean), a])} className="text-xs border border-ink/15 px-2 py-1 hover:border-ink">+ {a}</button>
          ))}
        </div>
      </Block>

      <Block title={`Fotos (${gallery.length})`}>
        <div className="flex flex-wrap gap-3 mb-4">
          <label className="inline-flex items-center gap-2 text-sm border border-ink/20 px-3 py-2 cursor-pointer hover:border-ink">
            Enviar fotos das áreas comuns
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
          </label>
          <button type="button" onClick={() => setShowListing((v) => !v)} className="text-sm border border-ink/20 px-3 py-2 hover:border-ink">
            {showListing ? "Esconder" : "Escolher"} fotos dos anúncios ({listing.length})
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {gallery.map((p, i) => (
            <div key={p.url + i} className="border border-ink/10">
              <img src={resized(p.url, 300)} data-orig={p.url} onError={onImgFallback} alt="" className="w-full aspect-[4/3] object-cover" loading="lazy" />
              <Input value={p.alt ?? ""} onChange={(e) => setGallery((g) => g.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} placeholder="Descrição (alt)" className="text-xs h-8 rounded-none border-0 border-t" />
              <div className="flex justify-between text-xs px-2 py-1">
                <span>{i === 0 ? "Capa" : `#${i + 1}`}</span>
                <span className="flex gap-2">
                  <button type="button" onClick={() => move(i, -1)} aria-label="Subir">↑</button>
                  <button type="button" onClick={() => move(i, 1)} aria-label="Descer">↓</button>
                  <button type="button" onClick={() => setGallery((g) => g.filter((_, j) => j !== i))} className="text-red-600" aria-label="Remover">×</button>
                </span>
              </div>
            </div>
          ))}
        </div>
        {showListing && (
          <div className="mt-6">
            <p className="text-xs text-muted-foreground mb-2">Clique para adicionar à galeria. Prefira fachada, piscina, academia e outras áreas comuns.</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-1 max-h-[480px] overflow-auto">
              {listing.map((p) => {
                const inG = gallery.some((g) => g.url === p.url);
                return (
                  <button key={p.url} type="button" disabled={inG} onClick={() => setGallery((g) => [...g, { url: p.url, alt: `${c.name} — foto` }])} className={`relative ${inG ? "opacity-30" : "hover:ring-2 ring-[#F2DA00]"}`} title={p.code}>
                    <img src={resized(p.url, 160)} data-orig={p.url} onError={onImgFallback} alt="" loading="lazy" className="w-full aspect-[4/3] object-cover" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Block>

      <Block title={`Proximidades (${nearby.length})`}>
        <div className="flex items-center gap-3 mb-3">
          <Button size="sm" variant="outline" onClick={recalc} disabled={busy}>Recalcular pela latitude/longitude</Button>
          <span className="text-xs text-muted-foreground">Escolas, shopping, supermercado, farmácia, hospital e parque — distância e tempo de carro sem trânsito.</span>
        </div>
        {nearby.length > 0 && (
          <table className="text-sm"><tbody>
            {nearby.map((n, i) => (
              <tr key={i} className="border-t border-ink/8">
                <td className="pr-4 py-1 text-muted-foreground">{n.cat}</td><td className="pr-4">{n.name}</td><td className="pr-4 tabular-nums">{n.km} km</td><td className="tabular-nums">{n.min ?? "—"} min</td>
                <td className="pl-3"><button type="button" className="text-red-600 text-xs" onClick={async () => { const nn = nearby.filter((_, j) => j !== i); setNearby(nn); await saveNear({ data: { id, nearby: nn } }); }}>remover</button></td>
              </tr>
            ))}
          </tbody></table>
        )}
      </Block>

      <Block title={`Perguntas frequentes (${faq.length})`}>
        <p className="text-xs text-muted-foreground mb-3">“Quanto custa”, “Qual é o lazer” e “O que fica perto” são geradas sozinhas na página. Aqui ficam as perguntas fixas.</p>
        <div className="space-y-3">
          {faq.map((x, i) => (
            <div key={i} className="border border-ink/10 p-3 space-y-2">
              <Input value={x.question} onChange={(e) => setFaq((a) => a.map((y, j) => (j === i ? { ...y, question: e.target.value } : y)))} placeholder="Pergunta" className="text-sm" />
              <Textarea value={x.answer} onChange={(e) => setFaq((a) => a.map((y, j) => (j === i ? { ...y, answer: e.target.value } : y)))} placeholder="Resposta" rows={3} className="text-sm" />
              <button type="button" className="text-xs text-red-600" onClick={() => setFaq((a) => a.filter((_, j) => j !== i))}>Remover</button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setFaq((a) => [...a, { question: "", answer: "" }])}>+ Pergunta</Button>
        </div>
      </Block>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-ink/10 p-5">
      <h3 className="font-serif text-lg mb-4">{title}</h3>
      {children}
    </section>
  );
}
