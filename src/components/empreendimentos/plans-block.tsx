import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const PLAN_CATEGORIES = [
  { value: "planta-padrao", label: "Planta padrão", kind: "planta" },
  { value: "planta-alternativa", label: "Planta alternativa", kind: "planta" },
  { value: "planta-pavimento", label: "Planta do pavimento", kind: "planta" },
  { value: "implantacao", label: "Implantação", kind: "implantacao" },
  { value: "implantacao-lazer", label: "Implantação de lazer", kind: "implantacao" },
  { value: "tour", label: "Tour virtual", kind: "tour" },
] as const;

export type EmpreendimentoPlan = {
  id: string;
  kind: string;
  category: string | null;
  title: string | null;
  area_label: string | null;
  description: string | null;
  image_url: string | null;
  thumb_url: string | null;
  embed_url: string | null;
  credit: string | null;
  source: string | null;
  sort_order: number;
};

export function useEmpreendimentoPlans(empreendimentoSlug: string) {
  const [items, setItems] = useState<EmpreendimentoPlan[] | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("empreendimento_plans")
        .select("id,kind,category,title,area_label,description,image_url,thumb_url,embed_url,credit,source,sort_order")
        .eq("empreendimento_slug", empreendimentoSlug)
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (active) setItems((data ?? []) as EmpreendimentoPlan[]);
    })();
    return () => {
      active = false;
    };
  }, [empreendimentoSlug]);
  return items;
}

const labelFor = (p: EmpreendimentoPlan) =>
  p.title || PLAN_CATEGORIES.find((c) => c.value === p.category)?.label || "Item";

export function EmpreendimentoPlansBlock({
  empreendimentoSlug,
  name,
}: {
  empreendimentoSlug: string;
  name: string;
}) {
  const items = useEmpreendimentoPlans(empreendimentoSlug);
  const plantas = useMemo(() => (items ?? []).filter((i) => i.kind === "planta"), [items]);
  const implantacao = useMemo(() => (items ?? []).filter((i) => i.kind === "implantacao"), [items]);
  const tours = useMemo(() => (items ?? []).filter((i) => i.kind === "tour"), [items]);

  const tabs = [
    plantas.length ? { id: "plantas", label: "Plantas" } : null,
    implantacao.length ? { id: "implantacao", label: "Implantação" } : null,
    tours.length ? { id: "tour", label: "Tour virtual" } : null,
  ].filter(Boolean) as { id: string; label: string }[];

  const [tab, setTab] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (tabs.length && (!tab || !tabs.some((t) => t.id === tab))) setTab(tabs[0].id);
  }, [tabs, tab]);

  if (!items || tabs.length === 0) return null;

  const active = tab ?? tabs[0].id;
  const list = active === "plantas" ? plantas : active === "implantacao" ? implantacao : tours;
  const current = list[Math.min(selected, list.length - 1)];

  return (
    <section className="bg-[#EAEAE6] px-6 py-16" aria-label={`Plantas e implantação — ${name}`}>
      <div className="mx-auto max-w-6xl">
        <h2 className="font-display mb-6 text-2xl text-[#171717]">Plantas, implantação e tour virtual</h2>

        <div className="flex flex-wrap gap-2 border-b border-[#0D0D0D]/10 pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setSelected(0);
              }}
              className={`px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] transition ${
                active === t.id ? "bg-[#0D0D0D] text-white" : "text-[#1A1A1A]/60 hover:text-[#0D0D0D]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {active === "tour" ? (
          <div className="mt-6 space-y-8">
            {tours.map((t) => (
              <figure key={t.id}>
                {t.embed_url ? (
                  <div className="aspect-video w-full overflow-hidden bg-black">
                    <iframe
                      src={t.embed_url}
                      title={labelFor(t)}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; xr-spatial-tracking"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  </div>
                ) : t.image_url ? (
                  <img src={t.image_url} alt={labelFor(t)} loading="lazy" className="w-full object-cover" />
                ) : null}
                <figcaption className="mt-2 text-sm text-[#1A1A1A]/70">
                  {labelFor(t)}
                  {t.description ? ` — ${t.description}` : ""}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="mt-6 grid gap-8 md:grid-cols-[0.35fr_0.65fr]">
            <ul className="space-y-2">
              {list.map((p, i) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(i)}
                    className={`flex w-full items-center gap-3 border p-3 text-left transition ${
                      i === (current ? list.indexOf(current) : 0)
                        ? "border-[#0D0D0D] bg-white"
                        : "border-[#0D0D0D]/10 hover:border-[#0D0D0D]/30"
                    }`}
                  >
                    {(p.thumb_url || p.image_url) && (
                      <img
                        src={p.thumb_url || p.image_url || ""}
                        alt=""
                        loading="lazy"
                        className="h-12 w-12 shrink-0 object-cover"
                      />
                    )}
                    <span>
                      <span className="block text-sm font-medium text-[#171717]">{labelFor(p)}</span>
                      {p.area_label && (
                        <span className="block text-xs text-[#1A1A1A]/55">{p.area_label}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {current && (
              <figure>
                {current.image_url && (
                  <img
                    src={current.image_url}
                    alt={labelFor(current)}
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 768px) 92vw, 700px"
                    className="w-full bg-white object-contain ring-1 ring-[#0D0D0D]/8"
                  />
                )}
                <figcaption className="mt-3 text-sm leading-relaxed text-[#1A1A1A]/70">
                  <strong className="text-[#171717]">{labelFor(current)}</strong>
                  {current.area_label ? ` · ${current.area_label}` : ""}
                  {current.description ? ` — ${current.description}` : ""}
                  {(current.credit || current.source) && (
                    <span className="mt-1 block text-xs text-[#1A1A1A]/45">
                      {current.credit ? `Crédito: ${current.credit}` : ""}
                      {current.credit && current.source ? " · " : ""}
                      {current.source ? `Fonte: ${current.source}` : ""}
                    </span>
                  )}
                </figcaption>
              </figure>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
