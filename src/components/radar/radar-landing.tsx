import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Radar } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { RADAR_INTERESTS } from "@/lib/radar-config";
import { RADAR_PAGES, type RadarFaq } from "@/lib/radar-pages";
import { RadarFlow } from "./radar-flow";

type Props = {
  h1: string;
  intro: string[];
  faq: RadarFaq[];
  interest?: string;
  crumb?: string;
};

export function RadarLanding({ h1, intro, faq, interest, crumb }: Props) {
  const others = RADAR_PAGES.filter((p) => p.interest !== interest);
  return (
    <SiteLayout>
      <section className="bg-primary text-primary-foreground px-6 pt-10 pb-16 md:pt-14 md:pb-20">
        <div className="max-w-6xl mx-auto">
          <nav aria-label="Trilha" className="text-xs text-primary-foreground/60">
            <Link to="/" className="hover:text-accent">Início</Link>
            <span className="mx-2">/</span>
            {crumb ? (
              <>
                <Link to="/radar" className="hover:text-accent">Radar</Link>
                <span className="mx-2">/</span>
                <span className="text-primary-foreground">{crumb}</span>
              </>
            ) : (
              <span className="text-primary-foreground">Radar</span>
            )}
          </nav>
          <p className="mt-8 text-xs uppercase font-semibold text-accent inline-flex items-center gap-2">
            <Radar className="h-4 w-4" aria-hidden="true" /> Radar S.A. Imóveis
          </p>
          <h1 className="mt-4 font-display text-4xl md:text-5xl font-medium leading-[1.12] text-balance max-w-4xl">
            {h1}
          </h1>
          <div className="mt-6 max-w-[65ch] space-y-4 text-primary-foreground/75 text-base md:text-lg leading-relaxed">
            {intro.map((t) => <p key={t}>{t}</p>)}
          </div>
          <a
            href="#radar-questionario"
            className="mt-8 inline-flex items-center gap-2 bg-accent text-accent-foreground px-7 py-4 text-sm font-bold rounded-sm"
          >
            Responder o Radar <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </section>

      {!interest ? (
        <section aria-labelledby="radar-objetivos" className="px-6 py-14 md:py-16">
          <div className="max-w-6xl mx-auto">
            <h2 id="radar-objetivos" className="font-display text-3xl md:text-4xl font-medium">
              Qual é o seu objetivo?
            </h2>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {RADAR_INTERESTS.map((i) => {
                const page = RADAR_PAGES.find((p) => p.interest === i.value);
                if (!page) return null;
                return (
                  <li key={i.value}>
                    <Link
                      to="/radar/$objetivo"
                      params={{ objetivo: page.slug }}
                      className="group block h-full rounded-xl border border-border bg-card p-5 transition hover:border-foreground hover:-translate-y-0.5"
                    >
                      <span className="flex items-start justify-between gap-3 font-medium text-foreground">
                        {i.title}
                        <ArrowUpRight className="h-4 w-4 shrink-0 opacity-50 group-hover:opacity-100" aria-hidden="true" />
                      </span>
                      <span className="mt-2 block text-sm text-muted-foreground leading-relaxed">{i.description}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="px-4 md:px-6 py-10 md:py-14 scroll-mt-24" id="questionario">
        <div className="max-w-4xl mx-auto">
          <RadarFlow variant="page" initialInterest={interest} />
        </div>
      </section>

      <section aria-labelledby="radar-faq" className="px-6 py-14 md:py-16 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <h2 id="radar-faq" className="font-display text-3xl md:text-4xl font-medium">Perguntas frequentes</h2>
          <dl className="mt-8 divide-y divide-border">
            {faq.map((f) => (
              <div key={f.q} className="py-5">
                <dt className="font-medium text-foreground">{f.q}</dt>
                <dd className="mt-2 text-muted-foreground leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {interest ? (
        <section className="px-6 pb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Outros objetivos do Radar</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {others.map((p) => (
                <li key={p.slug}>
                  <Link to="/radar/$objetivo" params={{ objetivo: p.slug }} className="inline-block rounded-full border border-border px-4 py-2 text-sm hover:border-foreground">
                    {p.h1}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </SiteLayout>
  );
}

export function radarJsonLd(faq: RadarFaq[], crumbs: { name: string; url: string }[]) {
  return [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }),
    },
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
      }),
    },
  ];
}
