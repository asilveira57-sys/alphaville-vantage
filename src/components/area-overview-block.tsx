import { Link } from "@tanstack/react-router";
import { GuideDownloadLead } from "@/components/guide-download-lead";
import { brl, groupNearby, kmLabel, type AreaOverview } from "@/lib/street-overview";

/** Blocos de dados ao vivo do guia de bairro: números, condomínios, ruas, mapa, entorno e ficha em PDF. */
export function AreaOverviewBlock({ slug, o }: { slug: string; o: AreaOverview }) {
  const label = o.label ?? "o bairro";
  const onde = o.onde ?? `em ${label}`;
  const nearGroups = groupNearby(o.nearby);
  const mapQuery = o.map_query ?? label;
  const hasNumbers = o.total > 0;

  return (
    <section className="px-6 py-16 border-t border-ink/8">
      <div className="max-w-5xl mx-auto space-y-16">
        {hasNumbers && (
          <div>
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-2">{label} em números hoje</h2>
            <p className="text-sm text-muted-foreground mb-8">Imóveis ativos na carteira da S.A Imóveis {onde}. Os números mudam conforme os imóveis entram e saem.</p>
            <div className="grid grid-cols-3 gap-px bg-ink/10 border border-ink/10 max-w-3xl">
              {[["Imóveis", o.total], ["À venda", o.venda], ["Para alugar", o.aluguel]].map(([l, v]) => (
                <div key={l as string} className="bg-background p-5">
                  <p className="font-serif text-3xl md:text-4xl text-ink">{v as number}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{l as string}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/15 text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    <th className="py-3 pr-4 font-medium">Tipo</th>
                    <th className="py-3 pr-4 font-medium">Imóveis</th>
                    <th className="py-3 pr-4 font-medium">Venda a partir de</th>
                    <th className="py-3 pr-4 font-medium">Venda (mediana)</th>
                    <th className="py-3 font-medium">Aluguel a partir de</th>
                  </tr>
                </thead>
                <tbody>
                  {o.tipos.map((t) => (
                    <tr key={t.grupo} className="border-b border-ink/10">
                      <td className="py-3 pr-4 text-ink">{t.grupo}</td>
                      <td className="py-3 pr-4">{t.n}</td>
                      <td className="py-3 pr-4">{brl(t.min_venda) ?? "—"}</td>
                      <td className="py-3 pr-4">{brl(t.med_venda) ?? "—"}</td>
                      <td className="py-3">{t.min_aluguel ? `${brl(t.min_aluguel)}/mês` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {o.condominios.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-2">Condomínios {onde}</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {o.total_condominios > o.condominios.length
                ? `Os ${o.condominios.length} com mais imóveis na nossa carteira hoje (de ${o.total_condominios}).`
                : "Com imóveis ativos na nossa carteira hoje."}
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
              {o.condominios.map((c) => (
                <li key={c.nome} className="flex justify-between gap-4 border-b border-ink/10 py-3 text-sm">
                  {c.slug ? (
                    <Link to={"/condominios/$slug" as never} params={{ slug: c.slug } as never} className="text-ink underline-offset-4 hover:underline">{c.nome}</Link>
                  ) : (
                    <span className="text-ink">{c.nome}</span>
                  )}
                  <span className="text-muted-foreground shrink-0">{c.n} {c.n === 1 ? "imóvel" : "imóveis"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {o.ruas.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-6">Ruas {onde} com guia no portal</h2>
            <ul className="flex flex-wrap gap-3">
              {o.ruas.map((r) => (
                <li key={r.slug}>
                  <Link to={"/ruas/$slug" as never} params={{ slug: r.slug } as never}
                    className="inline-block border border-ink/15 px-4 py-2 text-sm hover:border-ink">
                    {r.nome} <span className="text-muted-foreground">· {r.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h2 className="font-serif text-2xl md:text-3xl text-ink mb-6">Mapa: {label}</h2>
          <div className="aspect-[16/9] w-full border border-ink/10 bg-muted">
            <iframe
              title={`Mapa de ${label}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`}
              className="h-full w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`} target="_blank" rel="noopener noreferrer"
            className="mt-4 inline-block text-[11px] uppercase tracking-[0.2em] underline">Traçar rota →</a>
        </div>

        {nearGroups.length > 0 && (
          <div>
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-2">Escolas, mercados, saúde e lazer</h2>
            <p className="text-sm text-muted-foreground mb-8">Os mais próximos dos condomínios {onde}. Distâncias de carro pelas ruas, sem trânsito. Fonte: OpenStreetMap.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              {nearGroups.map((g) => (
                <div key={g.cat}>
                  <h3 className="text-[10px] uppercase tracking-[0.25em] font-bold text-muted-foreground mb-2">{g.cat}</h3>
                  <ul>
                    {g.items.map((i) => (
                      <li key={i.name} className="flex justify-between gap-4 border-b border-ink/10 py-2 text-sm">
                        <span className="text-ink">{i.name}</span>
                        <span className="text-muted-foreground shrink-0">{kmLabel(i)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasNumbers && (
          <GuideDownloadLead
            kind="bairro"
            slug={slug}
            title={label}
            heading={`Baixe a ficha: ${label}`}
            modalTitle={`Receba a ficha: ${label}`}
            text="PDF com os imóveis e preços de hoje, os condomínios, as ruas e o que tem perto. Gratuito: só pedimos seu contato."
            fileName={`ficha-${slug}-sa-imoveis.pdf`}
            buildPdf={async (firstName) => {
              const { buildStreetFichaPdf } = await import("@/lib/street-ficha-pdf");
              return buildStreetFichaPdf({
                kind: "bairro", name: label, slug, urlPath: `/guia/${slug}`,
                local: (o.map_query ?? "").replace(/ - SP$/, ""),
                firstName, overview: o, nearby: o.nearby, ruas: o.ruas,
              });
            }}
          />
        )}
      </div>
    </section>
  );
}
