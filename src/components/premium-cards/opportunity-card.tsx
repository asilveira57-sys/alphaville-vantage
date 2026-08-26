import { ArrowUpRight, BedDouble, Car, Ruler } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { resolveImage } from "@/lib/image-fallbacks";
import type { OpportunityDTO, OpportunitySignal } from "@/lib/opportunities.functions";

const brl = (n: number | null | undefined, digits = 0) =>
  n == null
    ? null
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: digits,
      }).format(n);

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

/** Compacta valores altos: R$ 380 mil, R$ 1,2 mi. */
function compact(amount: number) {
  if (amount >= 1_000_000) {
    const mi = amount / 1_000_000;
    return `R$ ${mi.toFixed(mi < 10 ? 1 : 0).replace(".", ",")} mi`;
  }
  return `R$ ${Math.round(amount / 1000)} mil`;
}

/**
 * Mensagem flutuante. Cada frase vem de um dado do sistema, com data —
 * nunca de um campo livre no admin.
 */
export function SignalPill({ signal }: { signal: OpportunitySignal }) {
  const text =
    signal.kind === "price_drop"
      ? `Preço reduzido em ${compact(signal.amount)} · ${shortDate(signal.observedAt)}`
      : `Entrou na vitrine em ${shortDate(signal.publishedAt)}`;

  return (
    <span className="inline-flex items-center rounded-sm border-l-[3px] border-[#1B4FD8] bg-white/95 px-3 py-1.5 text-[12px] font-semibold leading-tight text-[#1B4FD8] shadow-[0_6px_18px_-12px_rgba(13,13,13,0.7)] backdrop-blur-sm">
      {text}
    </span>
  );
}

function shortName(title: string) {
  const cut = title.trim().split(/\s+[-–—]\s+/)[0] ?? title;
  return cut.length > 4 ? cut : title;
}

export type OpportunityCardProps = {
  item: OpportunityDTO;
  /** O primeiro card da home carrega cedo — é o candidato a LCP. */
  priority?: boolean;
  /** No hub, a foto principal ganha mais altura. */
  size?: "default" | "large";
};

export function OpportunityCard({
  item,
  priority = false,
  size = "default",
}: OpportunityCardProps) {
  const price = brl(item.price_sale) ?? brl(item.price_rent) ?? "Sob consulta";
  const label = item.price_sale ? "Venda" : item.price_rent ? "Locação" : "Consulta";
  const place = [item.neighborhood, item.city].filter(Boolean).join(", ");
  const src = resolveImage(item.image, {
    type: "property",
    region: item.region ?? item.city,
    seed: item.slug,
  });

  const specs: { icon: React.ReactNode; label: string }[] = [];
  if (item.bedrooms)
    specs.push({
      icon: <BedDouble className="h-3.5 w-3.5 text-[#1A1A1A]/45" />,
      label: `${item.bedrooms} ${item.bedrooms === 1 ? "dorm" : "dorms"}`,
    });
  if (item.parking)
    specs.push({
      icon: <Car className="h-3.5 w-3.5 text-[#1A1A1A]/45" />,
      label: `${item.parking} ${item.parking === 1 ? "vaga" : "vagas"}`,
    });
  if (item.area)
    specs.push({
      icon: <Ruler className="h-3.5 w-3.5 text-[#1A1A1A]/45" />,
      label: `${Math.round(item.area)} m²`,
    });

  const signal = item.signals[0];

  return (
    <Link
      to={"/imoveis/$slug" as never}
      params={{ slug: item.slug } as never}
      className="group flex h-full flex-col overflow-hidden rounded-[16px] bg-white ring-1 ring-[#0D0D0D]/8 shadow-[0_14px_35px_-28px_rgba(13,13,13,0.6)] outline-none transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_-28px_rgba(13,13,13,0.55)] focus-visible:ring-2 focus-visible:ring-[#F2DA00]"
    >
      <div
        className={`relative shrink-0 overflow-hidden ${size === "large" ? "aspect-[4/3]" : "aspect-[16/9]"}`}
      >
        <img
          src={src}
          alt={item.title}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding={priority ? "sync" : "async"}
          sizes={
            size === "large" ? "(max-width: 900px) 92vw, 46vw" : "(max-width: 768px) 88vw, 31vw"
          }
          className="h-full w-full object-cover object-center transition-transform duration-[320ms] ease-out group-hover:scale-[1.04]"
        />
        <span className="absolute left-4 top-4 rounded-full bg-[#F2DA00] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0D0D0D]">
          Oportunidade
        </span>
        <span className="absolute right-4 top-4 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1A1A1A]/70 backdrop-blur-sm">
          {label}
        </span>
        {signal ? (
          <span className="absolute bottom-4 left-4 right-4">
            <SignalPill signal={signal} />
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <p className="line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1A1A1A]/50">
          {[item.property_type, item.condominium_name ?? item.neighborhood ?? item.city]
            .filter(Boolean)
            .join(" · ") || "Imóvel"}
        </p>
        <h3 className="font-display line-clamp-2 min-h-[2.5em] text-[19px] leading-[1.25] text-[#171717]">
          {shortName(item.title)}
        </h3>
        {item.headline ? (
          <p className="line-clamp-2 text-sm italic leading-snug text-[#1A1A1A]/65">
            “{item.headline}”
          </p>
        ) : place ? (
          <p className="line-clamp-1 text-sm text-[#1A1A1A]/55">{place}</p>
        ) : null}

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-1">
          <p className="font-sans text-[22px] font-extrabold leading-none tracking-tight text-[#0D0D0D]">
            {price}
          </p>
          {item.sqm_price ? (
            <p className="text-[12px] font-medium text-[#1A1A1A]/50">{brl(item.sqm_price)}/m²</p>
          ) : null}
        </div>

        {specs.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#0D0D0D]/8 pt-4">
            {specs.slice(0, 3).map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#1A1A1A]/70"
              >
                {s.icon} {s.label}
              </span>
            ))}
          </div>
        ) : null}

        <span className="mt-auto inline-flex items-center gap-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0D0D0D] transition-colors group-hover:text-[#0D0D0D]/60">
          Ver oportunidade
          <ArrowUpRight
            className="h-4 w-4 text-[#0D0D0D] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            strokeWidth={2.2}
          />
        </span>
      </div>
    </Link>
  );
}
