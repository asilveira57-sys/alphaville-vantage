import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CleanPropertyCard } from "@/components/premium-cards/clean-property-card";
import type { CondoPropertyDTO } from "@/lib/condo-properties.functions";

type Filter = "all" | "sale" | "rent";

const MAX = 9;

export function CondoPropertiesBlock({
  title,
  condominiumName,
  items,
}: {
  title: string;
  condominiumName: string | null;
  items: CondoPropertyDTO[];
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const sale = useMemo(
    () => items.filter((p) => p.purpose === "sale" || p.purpose === "both" || (!p.purpose && p.price_sale)),
    [items],
  );
  const rent = useMemo(
    () => items.filter((p) => p.purpose === "rent" || p.purpose === "both" || (!p.purpose && p.price_rent)),
    [items],
  );

  if (items.length === 0) return null;

  const current = filter === "sale" ? sale : filter === "rent" ? rent : items;
  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: items.length },
    { key: "sale", label: "À venda", count: sale.length },
    { key: "rent", label: "Para alugar", count: rent.length },
  ];

  const searchParams = {
    purpose: filter === "all" ? "" : filter,
    type: "",
    city: "",
    neighborhood: "",
    condo: condominiumName ?? "",
    bedrooms: 0,
    parking: 0,
    priceMin: 0,
    priceMax: 0,
    areaMin: 0,
    sort: "recent",
    q: condominiumName ?? "",
    page: 1,
  };

  return (
    <section className="px-6 py-16 border-t border-ink/8 bg-ink/[0.02]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
              Disponibilidade atual
            </p>
            <h2 className="font-serif text-3xl">{title}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                disabled={t.count === 0}
                className={`px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] rounded-full transition ${
                  filter === t.key
                    ? "bg-[#0D0D0D] text-white"
                    : "bg-white text-[#0D0D0D] ring-1 ring-[#0D0D0D]/12 hover:ring-[#0D0D0D]/30"
                } ${t.count === 0 ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {current.slice(0, MAX).map((p) => (
            <CleanPropertyCard
              key={p.id}
              slug={p.slug}
              title={p.title}
              image={p.image}
              region={p.region}
              neighborhood={p.neighborhood}
              city={p.city}
              propertyType={p.property_type}
              priceSale={p.price_sale}
              priceRent={p.price_rent}
              bedrooms={p.bedrooms}
              parking={p.parking}
              area={p.area}
              internalCode={p.internal_code}
            />
          ))}
        </div>

        <div className="mt-10">
          <Link
            to="/imoveis"
            search={searchParams as never}
            className="inline-block bg-brand-yellow text-brand-dark px-6 py-3 text-xs font-bold uppercase tracking-widest"
          >
            Ver todos os imóveis deste condomínio
          </Link>
        </div>
      </div>
    </section>
  );
}
