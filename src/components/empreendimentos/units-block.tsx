import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BedDouble, Car, Ruler } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type EmpreendimentoUnit = {
  id: string;
  slug: string;
  title: string;
  images: unknown;
  purpose: string | null;
  property_type: string | null;
  internal_code: string | null;
  area_useful: number | null;
  area_total: number | null;
  bedrooms: number | null;
  suites: number | null;
  parking: number | null;
  price_sale: number | null;
  price_rent: number | null;
};

const brl = (n: number | null) =>
  n == null
    ? null
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

const firstImage = (images: unknown): string | null => {
  if (!Array.isArray(images)) return null;
  const first = images[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && typeof (first as { url?: string }).url === "string")
    return (first as { url: string }).url;
  return null;
};

/**
 * Busca unidades vinculadas EXATAMENTE ao empreendimento (via condominiums.slug).
 * Sem busca textual aproximada, sem fallback por bairro/cidade/construtora
 * e sem listagem genérica quando não houver vínculo.
 */
export function useEmpreendimentoUnits(empreendimentoSlug: string) {
  const [units, setUnits] = useState<EmpreendimentoUnit[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: condo } = await supabase
        .from("condominiums")
        .select("id")
        .eq("slug", empreendimentoSlug)
        .maybeSingle();

      if (!condo?.id) {
        if (active) setUnits([]);
        // eslint-disable-next-line no-console
        console.info("[unidades]", {
          empreendimento_slug: empreendimentoSlug,
          campo_filtro: "properties.condominium_id (via condominiums.slug exato)",
          consulta: `condominiums.select(id).eq('slug','${empreendimentoSlug}')`,
          encontrados: 0,
          fallback_generico: "removido",
        });
        return;
      }

      const { data } = await supabase
        .from("properties")
        .select(
          "id, slug, title, images, purpose, property_type, internal_code, area_useful, area_total, bedrooms, suites, parking, price_sale, price_rent",
        )
        .eq("condominium_id", condo.id)
        .eq("status", "active")
        .limit(12);

      const valid = ((data ?? []) as EmpreendimentoUnit[]).filter(
        (u) => !!u.slug && !!u.title && !!u.property_type && !!u.purpose && !!u.internal_code,
      );

      if (active) setUnits(valid);
      // eslint-disable-next-line no-console
      console.info("[unidades]", {
        empreendimento_slug: empreendimentoSlug,
        campo_filtro: "properties.condominium_id (via condominiums.slug exato)",
        consulta: `properties.select(...).eq('condominium_id','${condo.id}').eq('status','active')`,
        encontrados: valid.length,
        fallback_generico: "removido",
      });
    })();
    return () => {
      active = false;
    };
  }, [empreendimentoSlug]);

  return units;
}

function UnitCard({ u }: { u: EmpreendimentoUnit }) {
  const img = firstImage(u.images);
  const area = u.area_useful ?? u.area_total;
  const price = brl(u.price_sale) ?? brl(u.price_rent);
  const finalidade = u.purpose === "rent" ? "Locação" : u.purpose === "sale" ? "Venda" : u.purpose;

  return (
    <Link
      to="/imoveis/$slug"
      params={{ slug: u.slug }}
      className="group flex flex-col overflow-hidden rounded-[14px] bg-white ring-1 ring-[#0D0D0D]/8 transition hover:ring-[#0D0D0D]/25"
    >
      {img ? (
        <img
          src={img}
          alt={u.title}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full object-cover"
        />
      ) : null}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1A1A1A]/45">
          {[finalidade, u.property_type].filter(Boolean).join(" · ")}
        </span>
        <h3 className="font-display text-lg leading-snug text-[#171717]">{u.title}</h3>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[#1A1A1A]/70">
          {area ? (
            <span className="inline-flex items-center gap-1.5">
              <Ruler className="h-3.5 w-3.5" /> {Math.round(area)} m²
            </span>
          ) : null}
          {u.bedrooms ? (
            <span className="inline-flex items-center gap-1.5">
              <BedDouble className="h-3.5 w-3.5" /> {u.bedrooms} dorms
            </span>
          ) : null}
          {u.suites ? <span>{u.suites} suítes</span> : null}
          {u.parking ? (
            <span className="inline-flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5" /> {u.parking} vagas
            </span>
          ) : null}
        </div>
        {price ? <p className="text-[17px] font-bold text-[#171717]">{price}</p> : null}
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#1A1A1A]/45">Código {u.internal_code}</p>
        <span className="mt-auto pt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#171717] group-hover:text-[#0D0D0D]">
          Ver imóvel
        </span>
      </div>
    </Link>
  );
}

export function EmpreendimentoUnitsBlock({
  empreendimentoSlug,
  contactHref,
}: {
  empreendimentoSlug: string;
  contactHref: string;
}) {
  const units = useEmpreendimentoUnits(empreendimentoSlug);

  if (units && units.length > 0) {
    return (
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {units.map((u) => (
          <UnitCard key={u.id} u={u} />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="max-w-[60ch] text-[15px] leading-relaxed text-[#1A1A1A]/70">
        No momento, não há unidades vinculadas a esta página. Consulte a equipe da S.A. Imóveis para verificar
        disponibilidade atualizada.
      </p>
      <a
        href={contactHref}
        className="mt-6 inline-flex items-center gap-2 bg-[#0D0D0D] px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#171717]"
      >
        Consultar disponibilidade
      </a>
    </div>
  );
}
