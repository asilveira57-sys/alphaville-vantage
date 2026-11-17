import { useState } from "react";
import { resized, onImgFallback } from "@/lib/img-resize";
import type { CondoDetailsDTO, CondoNearby } from "@/lib/condo-details.functions";
import type { CondoPropertyDTO } from "@/lib/condo-properties.functions";

/* Blocos da página de condomínio (modelo Bellagio): ficha técnica, lazer, fotos, mapa, distâncias e FAQ. */

const H2 = ({ children, id }: { children: React.ReactNode; id?: string }) => (
  <h2 id={id} className="font-serif text-2xl md:text-3xl text-ink mb-6 scroll-mt-28">{children}</h2>
);

const range = (vals: number[], unit = "") => {
  const v = vals.filter((x) => x > 0).sort((a, b) => a - b);
  if (!v.length) return null;
  const a = Math.round(v[0]!), b = Math.round(v[v.length - 1]!);
  return a === b ? `${a}${unit}` : `${a} a ${b}${unit}`;
};

export function mapQuery(d: CondoDetailsDTO, city?: string | null) {
  const label = d.official_name || d.name;
  if (d.address) return `${label}, ${d.address}${city ? ` - ${city}` : ""}, SP`;
  if (d.lat != null && d.lng != null) return `${d.lat},${d.lng}`;
  return `${label}, ${city ?? "Barueri"}, SP`;
}

/** Ficha técnica: dados cadastrados + faixas calculadas a partir dos anúncios ativos. */
export function CondoFacts({ d, items, neighborhood, city, parentName }: {
  d: CondoDetailsDTO; items: CondoPropertyDTO[]; neighborhood?: string | null; city?: string | null; parentName?: string | null;
}) {
  const areas = range(items.map((i) => i.area ?? 0), " m²");
  const beds = range(items.map((i) => i.bedrooms ?? 0));
  const parking = range(items.map((i) => i.parking ?? 0));
  const rows: Array<[string, string | null]> = [
    ["Nome do empreendimento", d.official_name],
    ["Endereço", d.address ? `${d.address}${d.postal_code ? ` · CEP ${d.postal_code}` : ""}` : null],
    ["Localização", [parentName ? `dentro do ${parentName}` : null, neighborhood, city].filter(Boolean).join(" · ") || null],
    ["Construtora / incorporadora", d.developer],
    ["Entrega", d.year_built ? String(d.year_built) : null],
    ["Torres", d.towers ? String(d.towers) : null],
    ["Andares", d.floors ? String(d.floors) : null],
    ["Unidades", d.units_count ? String(d.units_count) : null],
    ["Metragens (anúncios ativos)", areas],
    ["Dormitórios", beds],
    ["Vagas de garagem", parking],
  ];
  const shown = rows.filter(([, v]) => v);
  if (!shown.length) return null;
  return (
    <section className="px-6 py-14 border-t border-ink/8" aria-labelledby="ficha">
      <div className="max-w-5xl mx-auto">
        <H2 id="ficha">Ficha técnica do {d.name}</H2>
        <dl className="grid sm:grid-cols-2 gap-x-10 border-t border-ink/10">
          {shown.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-6 py-3 border-b border-ink/10 text-sm">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-ink font-medium text-right">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function CondoAmenities({ d }: { d: CondoDetailsDTO }) {
  if (!d.amenities.length) return null;
  return (
    <section className="px-6 py-14 border-t border-ink/8 bg-ink/[0.02]" aria-labelledby="lazer">
      <div className="max-w-5xl mx-auto">
        <H2 id="lazer">Lazer e comodidades do {d.name}</H2>
        <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3">
          {d.amenities.map((a) => (
            <li key={a} className="flex items-start gap-3 text-[15px] text-ink">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 bg-[#F2DA00] ring-1 ring-ink/30" />
              {a}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-muted-foreground">Itens informados pela administração e nos anúncios do condomínio; confirme na visita.</p>
      </div>
    </section>
  );
}

export function CondoGallery({ d }: { d: CondoDetailsDTO }) {
  const [open, setOpen] = useState<number | null>(null);
  const ph = d.gallery;
  if (!ph.length) return null;
  const alt = (i: number) => ph[i]?.alt || `${d.name} — foto ${i + 1}`;
  return (
    <section className="px-6 py-14 border-t border-ink/8" aria-labelledby="fotos">
      <div className="max-w-6xl mx-auto">
        <H2 id="fotos">Fotos do {d.name}</H2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ph.map((p, i) => (
            <button
              key={p.url}
              type="button"
              onClick={() => setOpen(i)}
              className={`group relative overflow-hidden bg-ink/5 ${i === 0 ? "col-span-2 row-span-2 aspect-[4/3]" : "aspect-[4/3]"}`}
              aria-label={`Ampliar: ${alt(i)}`}
            >
              <img
                src={resized(p.url, i === 0 ? 1100 : 560)}
                data-orig={p.url}
                onError={onImgFallback}
                alt={alt(i)}
                loading={i < 3 ? "eager" : "lazy"}
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </button>
          ))}
        </div>
      </div>
      {open != null && (
        <div role="dialog" aria-modal="true" aria-label={alt(open)} className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <img src={resized(ph[open]!.url, 1800)} data-orig={ph[open]!.url} onError={onImgFallback} alt={alt(open)} className="max-h-[88vh] max-w-full object-contain" />
          <button type="button" aria-label="Foto anterior" className="absolute left-3 top-1/2 -translate-y-1/2 text-white text-4xl px-3" onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + ph.length) % ph.length); }}>‹</button>
          <button type="button" aria-label="Próxima foto" className="absolute right-3 top-1/2 -translate-y-1/2 text-white text-4xl px-3" onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % ph.length); }}>›</button>
          <button type="button" aria-label="Fechar" className="absolute right-4 top-4 text-white text-3xl" onClick={() => setOpen(null)}>×</button>
          <p className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-sm">{open + 1} / {ph.length}</p>
        </div>
      )}
    </section>
  );
}

export function CondoMap({ d, city }: { d: CondoDetailsDTO; city?: string | null }) {
  const q = mapQuery(d, city);
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&hl=pt-BR&output=embed`;
  const route = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
  return (
    <section className="px-6 py-14 border-t border-ink/8" aria-labelledby="localizacao">
      <div className="max-w-6xl mx-auto">
        <H2 id="localizacao">Onde fica o {d.name}</H2>
        {d.address && <p className="-mt-3 mb-6 text-muted-foreground">{d.address}{city ? ` · ${city} - SP` : ""}{d.postal_code ? ` · CEP ${d.postal_code}` : ""}</p>}
        <div className="relative w-full aspect-[16/10] md:aspect-[21/9] bg-ink/5 border border-ink/10">
          <iframe
            title={`Mapa: localização do ${d.name}`}
            src={src}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full border-0"
            allowFullScreen
          />
        </div>
        <a href={route} target="_blank" rel="noopener" className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">Traçar rota no Google Maps ↗</a>
      </div>
    </section>
  );
}

const CAT_ORDER = ["Escolas", "Shopping", "Supermercado", "Farmácia", "Hospital", "Parque"];

export function CondoNearbyTable({ d }: { d: CondoDetailsDTO }) {
  if (!d.nearby.length) return null;
  const groups = new Map<string, CondoNearby[]>();
  d.nearby.forEach((n) => groups.set(n.cat, [...(groups.get(n.cat) ?? []), n]));
  const cats = [...groups.keys()].sort((a, b) => (CAT_ORDER.indexOf(a) + 99) % 99 - (CAT_ORDER.indexOf(b) + 99) % 99);
  const km = (v: number) => (v < 1 ? `${Math.round(v * 1000)} m` : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`);
  return (
    <section className="px-6 py-14 border-t border-ink/8 bg-ink/[0.02]" aria-labelledby="proximidades">
      <div className="max-w-5xl mx-auto">
        <H2 id="proximidades">O que fica perto do {d.name}</H2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.15em] text-muted-foreground border-b border-ink/15">
                <th className="py-3 pr-4 font-medium">Categoria</th>
                <th className="py-3 pr-4 font-medium">Local</th>
                <th className="py-3 pr-4 font-medium text-right">Distância</th>
                <th className="py-3 font-medium text-right">De carro</th>
              </tr>
            </thead>
            <tbody>
              {cats.flatMap((c) =>
                groups.get(c)!.sort((a, b) => a.km - b.km).map((n, i) => (
                  <tr key={c + n.name} className="border-b border-ink/8">
                    <td className="py-3 pr-4 text-muted-foreground">{i === 0 ? c : ""}</td>
                    <td className="py-3 pr-4 text-ink">{n.name}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{km(n.km)}</td>
                    <td className="py-3 text-right tabular-nums">{n.min ? `${n.min} min` : "—"}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Distância e tempo pelas ruas, sem trânsito (OpenStreetMap/OSRM). No horário de pico o tempo pode ser maior.</p>
      </div>
    </section>
  );
}

export function CondoFaqBlock({ items }: { items: Array<{ question: string; answer: string }> }) {
  if (!items.length) return null;
  return (
    <section className="px-6 py-14 border-t border-ink/8" aria-labelledby="faq">
      <div className="max-w-3xl mx-auto">
        <H2 id="faq">Perguntas frequentes</H2>
        <div className="divide-y divide-ink/10 border-y border-ink/10">
          {items.map((f, i) => (
            <details key={i} className="group py-4" open={i === 0}>
              <summary className="cursor-pointer list-none flex items-start justify-between gap-4 text-ink font-medium">
                <span>{f.question}</span>
                <span aria-hidden className="text-ink/40 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <div className="mt-3 text-ink/75 leading-relaxed whitespace-pre-line">{f.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Sumário com âncoras — ajuda o leitor e gera sitelinks no Google. */
export function CondoToc({ d, hasProps }: { d: CondoDetailsDTO; hasProps: boolean }) {
  const links: Array<[string, string]> = [
    ["#ficha", "Ficha técnica"],
    ...(d.amenities.length ? ([["#lazer", "Lazer"]] as Array<[string, string]>) : []),
    ...(d.gallery.length ? ([["#fotos", "Fotos"]] as Array<[string, string]>) : []),
    ["#localizacao", "Localização"],
    ...(d.nearby.length ? ([["#proximidades", "Proximidades"]] as Array<[string, string]>) : []),
    ...(hasProps ? ([["#imoveis", "Imóveis à venda e aluguel"]] as Array<[string, string]>) : []),
    ...(d.faq.length || d.amenities.length || d.nearby.length || hasProps ? ([["#faq", "Perguntas frequentes"]] as Array<[string, string]>) : []),
  ];
  return (
    <nav aria-label="Nesta página" className="mt-10 flex flex-wrap gap-2">
      {links.map(([h, t]) => (
        <a key={h} href={h} className="text-xs uppercase tracking-[0.14em] border border-ink/15 px-3 py-2 hover:border-ink">{t}</a>
      ))}
    </nav>
  );
}

const brl = (v: number) => v >= 1e6
  ? `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} milhões`
  : `R$ ${Math.round(v).toLocaleString("pt-BR")}`;

/** FAQ = perguntas cadastradas + perguntas calculadas na hora (preço e quantidade de imóveis ativos). */
export function buildCondoFaq(d: CondoDetailsDTO | null, items: Array<{ price_sale: number | null; price_rent: number | null }>, name: string) {
  const out: Array<{ question: string; answer: string }> = [];
  const sale = items.map((i) => i.price_sale ?? 0).filter((v) => v > 0).sort((a, b) => a - b);
  const rent = items.map((i) => i.price_rent ?? 0).filter((v) => v > 0).sort((a, b) => a - b);
  if (sale.length || rent.length) {
    const parts: string[] = [];
    if (sale.length) parts.push(`${sale.length} ${sale.length === 1 ? "apartamento à venda" : "apartamentos à venda"} a partir de ${brl(sale[0]!)}`);
    if (rent.length) parts.push(`${rent.length} para alugar a partir de ${brl(rent[0]!)} por mês`);
    out.push({
      question: `Quanto custa um apartamento no ${name}?`,
      answer: `Hoje a S.A Imóveis tem ${parts.join(" e ")}. Os valores mudam conforme metragem, andar, vista e mobília; a lista completa está nesta página.`,
    });
  }
  if (d?.amenities.length) {
    out.push({ question: `Qual é o lazer do ${name}?`, answer: `O condomínio oferece ${d.amenities.slice(0, -1).join(", ").toLowerCase()} e ${d.amenities[d.amenities.length - 1]!.toLowerCase()}.` });
  }
  if (d?.nearby.length) {
    const pick = ["Escolas", "Shopping", "Supermercado", "Hospital"].map((c) => d.nearby.filter((n) => n.cat === c).sort((a, b) => a.km - b.km)[0]).filter(Boolean) as CondoNearby[];
    if (pick.length) out.push({
      question: `O que fica perto do ${name}?`,
      answer: pick.map((n) => `${n.name} (${n.km.toLocaleString("pt-BR")} km${n.min ? `, cerca de ${n.min} min de carro` : ""})`).join("; ") + ".",
    });
  }
  return [...(d?.faq ?? []), ...out];
}
