import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteLayout } from "./site-layout";

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
  items: { eyebrow: string; title: string; lead: string; to?: string }[];
}

export function ComingSoonGrid({ items }: ComingSoonGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
      {items.map((item, i) => {
        const inner = (
          <>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
              {item.eyebrow}
            </p>
            <h3 className="font-serif text-2xl font-medium leading-snug mb-3 text-balance group-hover:underline">
              {item.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
              {item.lead}
            </p>
          </>
        );
        return item.to ? (
          <a key={i} href={item.to} className="group block border-t border-ink/10 pt-6">
            {inner}
          </a>
        ) : (
          <article key={i} className="group border-t border-ink/10 pt-6">
            {inner}
          </article>
        );
      })}
    </div>
  );
}
