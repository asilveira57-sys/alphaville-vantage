import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteLayout } from "./site-layout";
import { PremiumCard } from "./premium-card";
import type { FallbackKind } from "@/lib/image-fallbacks";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface SectionPageProps {
  eyebrow: string;
  title: string;
  lead: string;
  breadcrumbs?: BreadcrumbItem[];
  children?: ReactNode;
}

const SITE_URL = "https://alphaville-vantage.lovable.app";

function buildBreadcrumbJsonLd(breadcrumbs: BreadcrumbItem[]) {
  const items = [
    { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
    ...breadcrumbs.map((b, i) => {
      const entry: Record<string, unknown> = {
        "@type": "ListItem",
        position: i + 2,
        name: b.label,
      };
      if (b.to) entry.item = `${SITE_URL}${b.to}`;
      return entry;
    }),
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

export function SectionPage({ eyebrow, title, lead, breadcrumbs, children }: SectionPageProps) {
  return (
    <SiteLayout>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbJsonLd(breadcrumbs)) }}
        />
      )}
      <section className="px-6 pt-16 md:pt-24 pb-12 border-b border-ink/8">
        <div className="max-w-7xl mx-auto">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav aria-label="Trilha de navegação" className="mb-8">
              <ol
                className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
                itemScope
                itemType="https://schema.org/BreadcrumbList"
              >
                <li
                  itemProp="itemListElement"
                  itemScope
                  itemType="https://schema.org/ListItem"
                >
                  <Link to="/" className="hover:text-ink" itemProp="item">
                    <span itemProp="name">Início</span>
                  </Link>
                  <meta itemProp="position" content="1" />
                </li>
                {breadcrumbs.map((b, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2"
                    itemProp="itemListElement"
                    itemScope
                    itemType="https://schema.org/ListItem"
                  >
                    <span aria-hidden>/</span>
                    {b.to ? (
                      <Link to={b.to} className="hover:text-ink" itemProp="item">
                        <span itemProp="name">{b.label}</span>
                      </Link>
                    ) : (
                      <span className="text-ink" itemProp="name" aria-current="page">
                        {b.label}
                      </span>
                    )}
                    <meta itemProp="position" content={String(i + 2)} />
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6">
            {eyebrow}
          </p>
          <h1 className="font-serif text-5xl md:text-6xl font-medium leading-[1.05] tracking-tight text-balance max-w-[22ch]">
            {title}
          </h1>
          <p className="mt-8 text-lg text-muted-foreground leading-relaxed max-w-[60ch] text-pretty">
            {lead}
          </p>
        </div>
      </section>

      {children && (
        <section className="px-6 py-20">
          <div className="max-w-7xl mx-auto">{children}</div>
        </section>
      )}

      <InstitutionalBlock />
    </SiteLayout>
  );
}

export function InstitutionalBlock() {
  return (
    <section className="px-6 py-24 border-t border-ink/8 bg-canvas">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6">
          S.A Imóveis Alphaville
        </p>
        <p className="font-serif text-2xl md:text-3xl leading-snug text-balance text-ink">
          Acompanhamos a evolução de Alphaville e região há mais de quinze anos. Conhecemos
          profundamente os condomínios, bairros e oportunidades que fazem deste um dos mercados
          imobiliários mais desejados do Brasil.
        </p>
      </div>
    </section>
  );
}

interface ComingSoonGridProps {
  items: {
    eyebrow: string;
    title: string;
    lead: string;
    to?: string;
    image?: string | null;
    icon?: ReactNode;
    fallback?: { type?: FallbackKind; region?: string | null; seed?: string | null };
  }[];
}

export function ComingSoonGrid({ items }: ComingSoonGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      {items.map((item, i) => {
        const fallback = item.fallback ?? { type: "post" as FallbackKind, seed: item.title };
        if (item.to) {
          return (
            <PremiumCard
              key={i}
              href={item.to}
              image={item.image ?? null}
              imageAlt={item.title}
              eyebrow={item.eyebrow}
              title={item.title}
              description={item.lead}
              icon={item.icon}
              cta="Explorar"
              aspectRatio="tall"
              fallback={fallback}
            />
          );
        }
        return (
          <article
            key={i}
            className="flex h-full flex-col overflow-hidden rounded-[16px] bg-white ring-1 ring-[#0D0D0D]/8 shadow-[0_14px_35px_-28px_rgba(13,13,13,0.6)]"
          >
            <div className="relative aspect-[16/9] shrink-0 overflow-hidden bg-[#EAEAE6]">
              <span className="absolute left-4 top-4 max-w-[85%] truncate rounded-full bg-[#F2DA00] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0D0D0D]">
                {item.eyebrow}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-6">
              <h3 className="font-display line-clamp-2 min-h-[2.5em] text-[19px] leading-[1.25] text-[#171717] text-balance">
                {item.title}
              </h3>
              <p className="line-clamp-3 text-sm leading-relaxed text-[#1A1A1A]/60">
                {item.lead}
              </p>
              <p className="mt-auto pt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#1A1A1A]/45">
                Em breve
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
