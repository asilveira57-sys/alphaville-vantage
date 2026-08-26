import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Printer } from "lucide-react";
import { getMediaKit, logMediaKitAction, type MediaKitData } from "@/lib/partners-area.functions";
import { BRAND, hasCreci } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/area-do-parceiro/$slug")({
  head: () => ({
    meta: [
      { title: "Mídia kit — Área do parceiro" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: MediaKitPage,
});

const brl = (n: number | null) =>
  n == null
    ? "Sob consulta"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(n);

const date = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

/**
 * Textos prontos para o parceiro publicar.
 *
 * Montados a partir dos dados do imóvel e da apuração — nunca escritos à
 * mão. Quando existe selo de preço, a frase sai com o número, a amostra, a
 * fonte e a data juntos: é assim que a alegação se sustenta, e resumir isso
 * em "abaixo do mercado" é justamente o que o termo de adesão proíbe.
 */
function buildCopy(kit: MediaKitData) {
  const p = kit.property;
  const place = [p.condominium_name ?? p.neighborhood, p.city].filter(Boolean).join(", ");
  const specs = [
    p.bedrooms ? `${p.bedrooms} dorm.` : null,
    p.suites ? `${p.suites} suíte${p.suites > 1 ? "s" : ""}` : null,
    p.parking ? `${p.parking} vaga${p.parking > 1 ? "s" : ""}` : null,
    p.area_useful ? `${Math.round(p.area_useful)} m² úteis` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const lastro = kit.valuation
    ? `\n\nValor por m² ${Math.abs(kit.valuation.deltaPct).toFixed(1).replace(".", ",")}% abaixo da referência: mediana de ${kit.valuation.sampleSize} imóveis comparáveis ${kit.valuation.methodLabel}. Fonte: ${kit.valuation.sourceLabel}. Apurado em ${date(kit.valuation.computedAt)}.`
    : "";

  const creci = BRAND.creci ? `\n${BRAND.creci}` : "";
  const link = `${BRAND.portal}/imoveis/${p.slug}`;

  const whatsapp =
    `*${p.property_type ?? "Imóvel"} ${p.purpose === "rent" ? "para locação" : "à venda"}${place ? ` — ${place}` : ""}*\n` +
    `${specs}\n` +
    `${p.purpose === "rent" ? brl(p.price_rent) + "/mês" : brl(p.price_sale)}` +
    lastro +
    `\n\nDetalhes: ${link}` +
    creci;

  const social =
    `${p.property_type ?? "Imóvel"}${place ? ` em ${place}` : ""}.\n` +
    `${specs}.\n` +
    `${p.purpose === "rent" ? brl(p.price_rent) + "/mês" : brl(p.price_sale)}.` +
    lastro +
    `\n\nInformações no link da bio.` +
    creci;

  return { whatsapp, social, link };
}

function MediaKitPage() {
  const { slug } = Route.useParams();
  const kitFn = useServerFn(getMediaKit);
  const logFn = useServerFn(logMediaKitAction);

  const [copied, setCopied] = useState<string | null>(null);

  const kit = useQuery({
    queryKey: ["partner", "kit", slug],
    queryFn: () => kitFn({ data: { slug } }),
  });

  if (kit.isLoading) {
    return <div className="mx-auto max-w-4xl px-6 py-24 text-sm">Carregando…</div>;
  }

  if (kit.isError) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24">
        <p className="text-sm text-red-700">
          Você não tem acesso a este material. Volte à{" "}
          <Link to={"/area-do-parceiro" as never} className="underline">
            área do parceiro
          </Link>
          .
        </p>
      </div>
    );
  }

  if (!kit.data) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24">
        <h1 className="font-serif text-2xl">Material indisponível</h1>
        <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
          Este imóvel saiu da vitrine ou o material venceu. Se você publicou algo sobre ele, remova
          as publicações — material vencido em circulação configura publicidade enganosa.
        </p>
        <Link to={"/area-do-parceiro" as never} className="mt-6 inline-block text-sm underline">
          Ver materiais disponíveis
        </Link>
      </div>
    );
  }

  const p = kit.data.property;
  const copy = buildCopy(kit.data);
  const creciMissing = !hasCreci();

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
      void logFn({ data: { propertyId: p.id, action: "copy_text" } }).catch(() => {});
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto manualmente.");
    }
  };

  const print = () => {
    void logFn({ data: { propertyId: p.id, action: "print" } }).catch(() => {});
    window.print();
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* ---------------------------------------------- controles (não imprimem) */}
      <div className="print:hidden">
        <Link
          to={"/area-do-parceiro" as never}
          className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-ink"
        >
          ← Área do parceiro
        </Link>

        {creciMissing && (
          <div className="mt-6 border-l-2 border-red-700 bg-red-50 p-5 text-sm text-red-900">
            <strong>Impressão bloqueada.</strong> O CRECI da imobiliária não está configurado, e
            material publicitário sem o número de registro contraria a Resolução COFECI 458/95 art.
            2º. Peça à equipe para preencher esse dado antes de distribuir o kit.
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={print}
            disabled={creciMissing}
            className="inline-flex items-center gap-2 bg-brand-yellow px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-brand-dark transition hover:brightness-95 disabled:opacity-40"
          >
            <Printer className="h-4 w-4" /> Imprimir / salvar em PDF
          </button>
          <button
            type="button"
            onClick={() => copyText("whatsapp", copy.whatsapp)}
            className="inline-flex items-center gap-2 border border-ink/20 px-5 py-3 text-[10px] uppercase tracking-widest hover:bg-ink/5"
          >
            <Copy className="h-4 w-4" />
            {copied === "whatsapp" ? "Copiado" : "Copiar texto de WhatsApp"}
          </button>
          <button
            type="button"
            onClick={() => copyText("social", copy.social)}
            className="inline-flex items-center gap-2 border border-ink/20 px-5 py-3 text-[10px] uppercase tracking-widest hover:bg-ink/5"
          >
            <Copy className="h-4 w-4" />
            {copied === "social" ? "Copiado" : "Copiar legenda de post"}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------- one-pager */}
      <article className="mt-10 border border-ink/15 bg-white p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/15 pb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              {BRAND.name}
              {BRAND.creci ? ` · ${BRAND.creci}` : ""}
            </p>
            <h1 className="font-serif mt-2 max-w-[28ch] text-2xl leading-tight md:text-3xl">
              {p.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {[p.condominium_name, p.neighborhood, p.city, p.state].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="text-right">
            <p className="font-serif text-2xl">
              {p.purpose === "rent" ? `${brl(p.price_rent)}/mês` : brl(p.price_sale)}
            </p>
            {p.internal_code ? (
              <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                cód. {p.internal_code}
              </p>
            ) : null}
          </div>
        </header>

        {kit.data.valuation ? (
          <section className="mt-6 border-l-2 border-brand-yellow bg-ink/[0.03] p-5 print:bg-transparent">
            <p className="text-sm font-semibold">{kit.data.valuation.badge}</p>
            <p className="mt-1.5 max-w-[70ch] text-xs leading-relaxed text-muted-foreground">
              Referência de {brl(kit.data.valuation.referenceSqmPrice)}/m²: mediana de{" "}
              {kit.data.valuation.sampleSize} imóveis comparáveis {kit.data.valuation.methodLabel},
              com a mesma tipologia. Fonte: {kit.data.valuation.sourceLabel}. Apurado em{" "}
              {date(kit.data.valuation.computedAt)}. Reproduza esta frase inteira ao divulgar.
            </p>
          </section>
        ) : null}

        {p.headline ? (
          <p className="mt-6 max-w-[62ch] font-serif text-lg italic leading-snug">“{p.headline}”</p>
        ) : null}

        <section className="mt-6 grid gap-6 md:grid-cols-3">
          <dl className="md:col-span-1">
            <p className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
              Ficha
            </p>
            {[
              ["Tipo", p.property_type],
              ["Dormitórios", p.bedrooms],
              ["Suítes", p.suites],
              ["Banheiros", p.bathrooms],
              ["Vagas", p.parking],
              // Anexo D do CONAR: área útil e área total precisam vir distintas.
              ["Área útil", p.area_useful ? `${Math.round(p.area_useful)} m²` : null],
              ["Área total", p.area_total ? `${Math.round(p.area_total)} m²` : null],
              ["Condomínio", p.condo_fee ? `${brl(p.condo_fee)}/mês` : null],
              ["IPTU", p.iptu ? brl(p.iptu) : null],
            ]
              .filter(([, v]) => v != null && v !== "")
              .map(([k, v]) => (
                <div
                  key={String(k)}
                  className="flex justify-between gap-4 border-b border-ink/10 py-2 text-sm"
                >
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right">{String(v)}</dd>
                </div>
              ))}
          </dl>

          <div className="md:col-span-2">
            <p className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
              Descrição aprovada
            </p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {p.description ?? "Sem descrição cadastrada."}
            </p>
          </div>
        </section>

        {p.images.length > 0 ? (
          <section className="mt-8">
            <p className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">
              Imagens
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {p.images.slice(0, 8).map((src) => (
                <img
                  key={src}
                  src={src}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Use as imagens sem tratamento que altere a realidade do imóvel (Anexo D do Código do
              CONAR).
            </p>
          </section>
        ) : null}

        <footer className="mt-8 border-t border-ink/15 pt-5 text-[11px] leading-relaxed text-muted-foreground">
          <p>
            {BRAND.name}
            {BRAND.creci ? ` · ${BRAND.creci}` : ""} · {BRAND.site}
          </p>
          <p className="mt-1">
            Material para divulgação por parceiros com contrato de intermediação. Não altere preço,
            condições ou alegações.
            {p.expiresAt ? ` Válido até ${date(p.expiresAt)}.` : ""}
          </p>
        </footer>
      </article>

      {/* --------------------------------------------- textos (não imprimem) */}
      <section className="mt-10 print:hidden">
        <h2 className="font-serif text-2xl">Textos prontos</h2>
        <p className="mt-2 max-w-[64ch] text-sm text-muted-foreground">
          Publique como está. Se precisar encurtar, corte a descrição — nunca a frase da comparação
          de preço, que só se sustenta com a amostra e a data junto.
        </p>

        {[
          { key: "whatsapp", title: "WhatsApp", text: copy.whatsapp },
          { key: "social", title: "Legenda de post", text: copy.social },
        ].map((block) => (
          <div key={block.key} className="mt-6 border border-ink/12">
            <div className="flex items-center justify-between border-b border-ink/10 px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {block.title}
              </p>
              <button
                type="button"
                className="text-[10px] uppercase tracking-widest underline"
                onClick={() => copyText(block.key, block.text)}
              >
                {copied === block.key ? "Copiado" : "Copiar"}
              </button>
            </div>
            <pre className="whitespace-pre-wrap p-4 font-sans text-sm leading-relaxed">
              {block.text}
            </pre>
          </div>
        ))}

        {p.images.length > 0 ? (
          <div className="mt-6 border border-ink/12">
            <div className="flex items-center justify-between border-b border-ink/10 px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Links das imagens
              </p>
              <button
                type="button"
                className="text-[10px] uppercase tracking-widest underline"
                onClick={() => {
                  void navigator.clipboard.writeText(p.images.join("\n"));
                  void logFn({ data: { propertyId: p.id, action: "copy_images" } }).catch(() => {});
                  setCopied("images");
                  setTimeout(() => setCopied(null), 2000);
                }}
              >
                {copied === "images" ? "Copiado" : "Copiar todos"}
              </button>
            </div>
            <ul className="max-h-56 overflow-y-auto p-4 text-xs text-muted-foreground">
              {p.images.map((src) => (
                <li key={src} className="truncate py-0.5">
                  <a href={src} target="_blank" rel="noreferrer" className="underline">
                    {src}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
