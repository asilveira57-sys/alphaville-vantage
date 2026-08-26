import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { SignalPill } from "@/components/premium-cards/opportunity-card";
import type { OpportunityDTO } from "@/lib/opportunities.functions";

const WHATSAPP_NUMBER = "5511995515053";

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

/**
 * Bloco de oportunidade na ficha do imóvel.
 *
 * A ficha é única — não existe uma segunda página para o mesmo imóvel. O que
 * muda quando ele entra na vitrine é este bloco: a leitura assinada da
 * equipe, os sinais derivados do histórico de preço e o caminho direto para
 * o corretor.
 */
export function OpportunityBanner({ item }: { item: OpportunityDTO }) {
  const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Olá! Vi ${item.title} na Vitrine de Oportunidades e gostaria de mais informações.`,
  )}`;

  return (
    <section className="border-b border-ink/8 bg-[#0D0D0D] px-6 py-10 text-[#EAEAE6]">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center bg-[#F2DA00] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#0D0D0D]">
              {item.valuation ? item.valuation.badge : "Vitrine de Oportunidades"}
            </span>
            {item.published_at ? (
              <span className="text-[11px] uppercase tracking-[0.16em] text-[#EAEAE6]/45">
                Selecionado em {longDate(item.published_at)}
              </span>
            ) : null}
          </div>

          {item.headline ? (
            <p className="font-display mt-6 max-w-[46ch] text-[24px] leading-snug text-pretty md:text-[28px]">
              “{item.headline}”
            </p>
          ) : (
            <p className="font-display mt-6 max-w-[46ch] text-[24px] leading-snug text-pretty md:text-[28px]">
              Selecionado pela equipe S.A Imóveis.
            </p>
          )}
          <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-[#EAEAE6]/45">
            Curadoria da equipe S.A Imóveis
          </p>

          {item.signals.length ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {item.signals.map((s) => (
                <SignalPill key={s.kind} signal={s} />
              ))}
            </div>
          ) : null}
        </div>

        <aside className="lg:col-span-4">
          <div className="border border-[#EAEAE6]/15 p-6">
            {item.sqm_price ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#EAEAE6]/45">
                  Valor por metro quadrado
                </p>
                <p className="font-display mt-2 text-[30px] leading-none">
                  {brl(item.sqm_price)}
                  <span className="ml-1 text-[15px] text-[#EAEAE6]/55">/m²</span>
                </p>
              </>
            ) : null}

            {item.valuation ? (
              <p className="mt-4 border-t border-[#EAEAE6]/15 pt-4 text-[12px] leading-relaxed text-[#EAEAE6]/60">
                Referência de {brl(item.valuation.referenceSqmPrice)}/m²: mediana de{" "}
                {item.valuation.sampleSize} imóveis comparáveis {item.valuation.methodLabel}, com a
                mesma tipologia. Fonte: {item.valuation.sourceLabel}. Apurado em{" "}
                {longDate(item.valuation.computedAt)}.
              </p>
            ) : null}

            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-[#F2DA00] px-6 py-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0D0D0D] transition hover:brightness-95"
            >
              <MessageCircle className="h-4 w-4" strokeWidth={2.4} />
              Fale agora com o corretor
            </a>

            <Link
              to={"/oportunidades" as never}
              hash="lista"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 border border-[#EAEAE6]/25 px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#EAEAE6] transition hover:border-[#EAEAE6]/60"
            >
              Receber as próximas oportunidades
            </Link>

            <p className="mt-5 text-[12px] leading-relaxed text-[#EAEAE6]/50">
              A seleção tem validade e é revista periodicamente.{" "}
              <Link
                to={"/oportunidades/metodologia" as never}
                className="underline hover:text-[#EAEAE6]"
              >
                Ver metodologia
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
