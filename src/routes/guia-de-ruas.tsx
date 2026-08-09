import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { SectionPage } from "@/components/section-page";
import { PremiumCard } from "@/components/premium-card";
import { Input } from "@/components/ui/input";
import { listPublishedStreets, type StreetListItem } from "@/lib/streets.functions";
import { listPublishedStreetGuides, type StreetGuideListItem } from "@/lib/street-guides.functions";

const SITE_URL = "https://alphaville-vantage.lovable.app";

const streetsQO = queryOptions({
  queryKey: ["ruas", "published"],
  queryFn: () => listPublishedStreets(),
});

const guidesQO = queryOptions({
  queryKey: ["street-guides", "published"],
  queryFn: () => listPublishedStreetGuides(),
});

export const Route = createFileRoute("/guia-de-ruas")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(streetsQO),
      context.queryClient.ensureQueryData(guidesQO),
    ]),
  head: () => ({
    meta: [
      { title: "Guia de Ruas de Alphaville, Tamboré, Barueri e Santana de Parnaíba" },
      {
        name: "description",
        content:
          "Hub completo de ruas, avenidas e alamedas da região de Alphaville. Busque pelo nome da via, filtre por cidade ou bairro e veja imóveis cadastrados em cada endereço.",
      },
      { property: "og:title", content: "Guia de Ruas de Alphaville e região" },
      {
        property: "og:description",
        content:
          "Busque ruas, avenidas e alamedas de Alphaville, Tamboré, Barueri e Santana de Parnaíba e encontre imóveis por endereço.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/guia-de-ruas` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/guia-de-ruas` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: "Guia de Ruas", item: `${SITE_URL}/guia-de-ruas` },
          ],
        }),
      },
    ],
  }),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <p className="text-sm">{error.message}</p>
      </section>
    </SiteLayout>
  ),
  notFoundComponent: () => null,
  component: GuiaDeRuasHub,
});

type Entry = {
  key: string;
  slug: string;
  name: string;
  kindLabel: string;
  city: string | null;
  neighborhood: string | null;
  description: string | null;
  image: string | null;
  featured: boolean;
  source: "rua" | "guia";
};

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function streetTypeLabel(t: string | null | undefined) {
  switch (t) {
    case "avenida": return "Avenida";
    case "alameda": return "Alameda";
    case "rodovia": return "Rodovia";
    case "estrada": return "Estrada";
    case "praca": return "Praça";
    case "travessa": return "Travessa";
    case "via": return "Via";
    default: return "Rua";
  }
}

function viaTypeLabel(t: string) {
  switch (t) {
    case "alameda": return "Alameda";
    case "avenida": return "Avenida";
    case "regiao": return "Região";
    case "calcada": return "Calçada";
    case "centro": return "Centro";
    default: return "Rua";
  }
}

function toEntries(streets: StreetListItem[], guides: StreetGuideListItem[]): Entry[] {
  const fromStreets: Entry[] = streets.map((s) => ({
    key: `rua-${s.id}`,
    slug: s.slug,
    name: s.name,
    kindLabel: streetTypeLabel(s.street_type),
    city: s.city,
    neighborhood: s.neighborhood,
    description: s.short_description,
    image: s.hero_image,
    featured: s.featured,
    source: "rua",
  }));
  const known = new Set(fromStreets.map((e) => norm(e.name)));
  const fromGuides: Entry[] = guides
    .filter((g) => !known.has(norm(g.name)))
    .map((g) => ({
      key: `guia-${g.id}`,
      slug: g.slug,
      name: g.name,
      kindLabel: viaTypeLabel(g.via_type),
      city: g.city,
      neighborhood: g.neighborhood ?? g.region,
      description: g.short_description,
      image: g.og_image,
      featured: false,
      source: "guia",
    }));
  return [...fromStreets, ...fromGuides].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

function GuiaDeRuasHub() {
  const { data: streets } = useSuspenseQuery(streetsQO);
  const { data: guides } = useSuspenseQuery(guidesQO);

  const all = useMemo(() => toEntries(streets, guides), [streets, guides]);

  const [q, setQ] = useState("all");
  const [city, setCity] = useState<string>("all");
  const [kind, setKind] = useState<string>("all");

  const cities = useMemo(
    () => [...new Set(all.map((e) => e.city).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [all],
  );
  const kinds = useMemo(
    () => [...new Set(all.map((e) => e.kindLabel))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [all],
  );

  const filtered = useMemo(() => {
    return all.filter((e) => {
      if (city !== "all" && e.city !== city) return false;
      if (kind !== "all" && e.kindLabel !== kind) return false;
      if (q !== "all" && e.key !== q) return false;
      return true;
    });
  }, [all, q, city, kind]);

  const selectable = useMemo(
    () =>
      all.filter((e) => {
        if (city !== "all" && e.city !== city) return false;
        if (kind !== "all" && e.kindLabel !== kind) return false;
        return true;
      }),
    [all, city, kind],
  );

  const featured = all.filter((e) => e.featured).slice(0, 3);

  const alphabet = useMemo(() => {
    const groups = new Map<string, Entry[]>();
    for (const e of filtered) {
      const letter = norm(e.name).charAt(0).toUpperCase().replace(/[^A-Z]/, "#");
      const arr = groups.get(letter) ?? [];
      arr.push(e);
      groups.set(letter, arr);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <SectionPage
      eyebrow="Guia de ruas"
      title="Guia de ruas, avenidas e alamedas de Alphaville e região"
      lead="Um mapa editorial das vias que estruturam Alphaville, Tamboré, Barueri e Santana de Parnaíba. Busque pelo nome da rua, filtre por cidade ou tipo de via e veja o perfil de cada endereço, com os imóveis cadastrados no local."
      breadcrumbs={[{ label: "Guia de Ruas" }]}
    >
      {featured.length > 0 && (
        <section className="mb-16">
          <h2 className="font-serif text-2xl md:text-3xl text-ink mb-8">Vias em destaque</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-10">
            {featured.map((e) => <EntryCard key={`f-${e.key}`} entry={e} />)}
          </div>
        </section>
      )}

      <div className="border border-ink/10 bg-white/60 p-5 md:p-6 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={q}
              onChange={(ev) => setQ(ev.target.value)}
              aria-label="Selecionar via"
              className="h-10 w-full border border-ink/15 bg-transparent pl-9 pr-3 text-sm"
            >
              <option value="all">Todas as vias</option>
              {selectable.map((e) => (
                <option key={e.key} value={e.key}>
                  {e.kindLabel} {e.name}
                  {e.neighborhood ? ` — ${e.neighborhood}` : ""}
                </option>
              ))}
            </select>
          </div>

          <select
            value={city}
            onChange={(ev) => setCity(ev.target.value)}
            aria-label="Filtrar por cidade"
            className="h-10 border border-ink/15 bg-transparent px-3 text-sm"
          >
            <option value="all">Todas as cidades</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={kind}
            onChange={(ev) => setKind(ev.target.value)}
            aria-label="Filtrar por tipo de via"
            className="h-10 border border-ink/15 bg-transparent px-3 text-sm"
          >
            <option value="all">Todos os tipos</option>
            {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "via encontrada" : "vias encontradas"}
        </p>
      </div>

      {all.length === 0 ? (
        <div className="border border-ink/10 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Estamos publicando os primeiros guias de ruas. Volte em breve — ou fale com a S.A Imóveis para orientações imediatas sobre a região.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-ink/10 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma via corresponde à sua busca. Tente outro termo ou remova os filtros.
          </p>
        </div>
      ) : (
        <div className="space-y-16">
          {alphabet.map(([letter, items]) => (
            <section key={letter}>
              <h2 className="font-serif text-3xl text-ink mb-8 border-b border-ink/10 pb-3">{letter}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
                {items.map((e) => <EntryCard key={e.key} entry={e} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="mt-20 pt-12 border-t border-ink/10 flex flex-wrap gap-6 text-[11px] uppercase tracking-[0.2em]">
        <Link to="/ruas" className="hover:underline">Ver índice completo de ruas →</Link>
        <Link to="/guia-de-ruas-alphaville" className="hover:underline">Guia editorial de Alphaville →</Link>
        <Link to="/imoveis" className="hover:underline">Buscar imóveis →</Link>
      </div>
    </SectionPage>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  const local = [entry.neighborhood, entry.city].filter(Boolean).join(" · ");
  const to = entry.source === "rua" ? "/ruas/$slug" : "/guia-de-ruas-alphaville/$slug";
  return (
    <PremiumCard
      to={to as never}
      params={{ slug: entry.slug } as never}
      image={entry.image}
      imageAlt={entry.name}
      eyebrow={`${entry.kindLabel}${local ? ` · ${local}` : ""}`}
      title={entry.name}
      description={entry.description ?? undefined}
      cta="Ver guia"
      aspectRatio="tall"
      fallback={{ type: "region", region: entry.neighborhood ?? entry.city, seed: entry.slug }}
    />
  );
}
