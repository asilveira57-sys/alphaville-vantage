import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { GoogleReviewsSection } from "@/components/google-reviews";
import { SITE_URL } from "@/lib/site";
import { OWNER_HUB, OWNER_OFFER, OWNER_PAGES } from "@/lib/owner-pages";

const URL = `${SITE_URL}/anuncie-seu-imovel`;

export const Route = createFileRoute("/anuncie-seu-imovel")({
  head: () => ({
    meta: [
      { title: OWNER_HUB.title },
      { name: "description", content: OWNER_HUB.description },
      { property: "og:title", content: OWNER_HUB.title },
      { property: "og:description", content: OWNER_HUB.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: AnunciePage,
});

function AnunciePage() {
  return (
    <SiteLayout>
      <section className="px-6 pt-14 md:pt-20 pb-16">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs tracking-[0.2em] uppercase text-ink/60 mb-4">Para proprietários</p>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight mb-6">{OWNER_HUB.h1}</h1>
          <p className="text-lg text-ink/80 leading-relaxed max-w-2xl mb-12">{OWNER_HUB.lead}</p>
          <div className="grid md:grid-cols-2 gap-6">
            {OWNER_PAGES.map((p) => (
              <Link key={p.path} to={p.path} className="group block bg-[#0D0D0D] text-white p-8 md:p-10 hover:ring-2 hover:ring-[#F2DA00]">
                <p className="text-xs tracking-[0.2em] uppercase text-[#F2DA00] mb-3">{p.finalidade}</p>
                <h2 className="font-serif text-3xl mb-3">{p.label}</h2>
                <p className="text-white/70 text-sm leading-relaxed mb-6">{p.description}</p>
                <span className="text-sm font-semibold text-[#F2DA00]">Começar →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="px-6 py-16 border-t border-ink/8">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {OWNER_OFFER.map((o) => (
            <div key={o.title}>
              <h3 className="font-serif text-xl mb-2">{o.title}</h3>
              <p className="text-ink/75 text-sm leading-relaxed">{o.text}</p>
            </div>
          ))}
        </div>
      </section>
      <GoogleReviewsSection />
    </SiteLayout>
  );
}
