import * as React from "react";
import { BedDouble, Car, Ruler } from "lucide-react";
import { PremiumCard } from "@/components/premium-card";

const fmt = (n: number | null | undefined) =>
  n == null ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

export type PremiumPropertyCardProps = {
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
  suites?: number | null;
  parking?: number | null;
  area?: number | null;
  internalCode?: string | null;
};

export function PremiumPropertyCard(p: PremiumPropertyCardProps) {
  const sale = fmt(p.priceSale);
  const rent = fmt(p.priceRent);
  const price = sale ?? rent ?? "Sob consulta";
  const label = sale ? "Venda" : rent ? "Locação" : "Consulta";

  const badges = (
    <>
      <span className="rounded-none bg-[#F2DA00] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0D0D0D]">
        {label}
      </span>
      {p.priceSale && p.priceSale >= 3_000_000 ? (
        <span className="rounded-none bg-black/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F2DA00] ring-1 ring-[#F2DA00]/40">
          Alto padrão
        </span>
      ) : null}
    </>
  );

  const specs: { icon: React.ReactNode; label: string }[] = [];
  if (p.bedrooms) specs.push({ icon: <BedDouble className="h-3.5 w-3.5" />, label: `${p.bedrooms} ${p.bedrooms === 1 ? "dorm" : "dorms"}` });
  if (p.parking) specs.push({ icon: <Car className="h-3.5 w-3.5" />, label: `${p.parking} vagas` });
  if (p.area) specs.push({ icon: <Ruler className="h-3.5 w-3.5" />, label: `${Math.round(p.area)} m²` });

  const footer = (
    <div className="flex flex-col gap-2">
      <p className="font-sans text-2xl md:text-[26px] font-extrabold tracking-tight leading-none text-white">
        {price}
      </p>
      {specs.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {specs.map((s) => (
            <span
              key={s.label}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/90 ring-1 ring-white/15 backdrop-blur"
            >
              {s.icon} {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  const eyebrow = [p.propertyType, p.neighborhood ?? p.city].filter(Boolean).join(" · ") || "Imóvel";

  return (
    <PremiumCard
      to={"/imoveis/$slug" as never}
      params={{ slug: p.slug } as never}
      image={p.image}
      imageAlt={p.title}
      eyebrow={eyebrow}
      title={p.title}
      badges={badges}
      cta="Ver imóvel"
      aspectRatio="tall"
      fallback={{ type: "property", region: p.region ?? p.city, seed: p.slug }}
      footer={footer}
    />
  );
}
