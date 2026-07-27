import { ArrowUpRight, BedDouble, Car, Ruler } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { resolveImage } from "@/lib/image-fallbacks";

const fmt = (n: number | null | undefined) =>
  n == null
    ? null
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(n);

export type CleanPropertyCardProps = {
  slug: string;
  title: string;
  image?: string | null;
  region?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  propertyType?: string | null;
  priceSale?: number | null;
  priceRent?: number | null;
  bedrooms?: number | null;
  parking?: number | null;
  area?: number | null;
  internalCode?: string | null;
};

/** Keeps a commercial-looking short name instead of a full street address. */
function shortName(title: string) {
  const cleaned = title
    .replace(/^\s*(apartamento|casa|cobertura|terreno|sobrado|sala|loja|galpão)\s+(à venda|para alugar|para venda)?\s*/i, (m) => m)
    .trim();
  const cut = cleaned.split(/\s+[-–—]\s+/)[0] ?? cleaned;
  return cut.length > 4 ? cut : cleaned;
}

export function CleanPropertyCard(p: CleanPropertyCardProps) {
  const sale = fmt(p.priceSale);
  const rent = fmt(p.priceRent);
  const price = sale ?? rent ?? "Sob consulta";
  const label = sale ? "Venda" : rent ? "Locação" : "Consulta";
  const place = [p.neighborhood, p.city].filter(Boolean).join(", ");
  const src = resolveImage(p.image, {
    type: "property",
    region: p.region ?? p.city,
    seed: p.slug,
  });

  const specs: { icon: React.ReactNode; label: string }[] = [];
  if (p.bedrooms)
    specs.push({
      icon: <BedDouble className="h-3.5 w-3.5 text-[#1A1A1A]/45" />,
      label: `${p.bedrooms} ${p.bedrooms === 1 ? "dorm" : "dorms"}`,
    });
  if (p.parking)
    specs.push({
      icon: <Car className="h-3.5 w-3.5 text-[#1A1A1A]/45" />,
      label: `${p.parking} ${p.parking === 1 ? "vaga" : "vagas"}`,
    });
  if (p.area)
    specs.push({
      icon: <Ruler className="h-3.5 w-3.5 text-[#1A1A1A]/45" />,
      label: `${Math.round(p.area)} m²`,
    });

  return (
    <Link
      to={"/imoveis/$slug" as never}
      params={{ slug: p.slug } as never}
      className="group flex h-full flex-col overflow-hidden rounded-[16px] bg-white ring-1 ring-[#0D0D0D]/8 shadow-[0_14px_35px_-28px_rgba(13,13,13,0.6)] outline-none transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_-28px_rgba(13,13,13,0.55)] focus-visible:ring-2 focus-visible:ring-[#F2DA00]"
    >
      <div className="relative aspect-[4/3] shrink-0 overflow-hidden">
        <img
          src={src}
          alt={p.title}
          loading="lazy"
          decoding="async"
          sizes="(max-width: 768px) 88vw, (max-width: 1200px) 45vw, 30vw"
          className="h-full w-full object-cover object-center transition-transform duration-[320ms] ease-out group-hover:scale-[1.04]"
        />
        <span className="absolute left-4 top-4 rounded-full bg-[#F2DA00] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0D0D0D]">
          {label}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <p className="line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1A1A1A]/50">
          {[p.propertyType, p.neighborhood ?? p.city].filter(Boolean).join(" · ") || "Imóvel"}
        </p>
        <h3 className="font-display line-clamp-2 text-[19px] leading-[1.25] text-[#171717]">
          {shortName(p.title)}
        </h3>
        {place ? <p className="line-clamp-1 text-sm text-[#1A1A1A]/55">{place}</p> : null}

        <p className="pt-1 font-sans text-[22px] font-extrabold leading-none tracking-tight text-[#0D0D0D]">
          {price}
        </p>

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
          Ver imóvel
          <ArrowUpRight
            className="h-4 w-4 text-[#0D0D0D] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            strokeWidth={2.2}
          />
        </span>
      </div>
    </Link>
  );
}
