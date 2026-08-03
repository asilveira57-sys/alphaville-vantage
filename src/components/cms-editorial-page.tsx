import { Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { EditorialContent } from "@/components/editorial-content";

type Page = {
  title: string;
  excerpt?: string | null;
  featured_image?: string | null;
  html_content: string;
};

/**
 * Renderização padrão de páginas criadas no CMS (empreendimentos, parceiros e afins).
 * Mantém o mesmo layout editorial usado em bairros e condomínios.
 */
export function CmsEditorialPage({
  page,
  parentLabel,
  parentTo,
}: {
  page: Page;
  parentLabel: string;
  parentTo: string;
}) {
  return (
    <SiteLayout>
      <section className="px-6 pt-16 md:pt-24 pb-12 border-b border-ink/8">
        <div className="max-w-5xl mx-auto">
          <nav aria-label="Trilha" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <li><Link to="/" className="hover:text-ink">Início</Link></li>
              <li className="flex items-center gap-2">
                <span aria-hidden>/</span>
                <a href={parentTo} className="hover:text-ink">{parentLabel}</a>
              </li>
              <li className="flex items-center gap-2"><span aria-hidden>/</span><span className="text-ink">{page.title}</span></li>
            </ol>
          </nav>
          <h1 className="font-serif text-5xl md:text-6xl font-medium leading-[1.05] tracking-tight text-balance max-w-[22ch]">
            {page.title}
          </h1>
          {page.excerpt && (
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed max-w-[60ch] text-pretty">{page.excerpt}</p>
          )}
        </div>
      </section>

      {page.featured_image && (
        <section className="px-6 py-12 bg-ink/[0.02]">
          <div className="max-w-5xl mx-auto">
            <img src={page.featured_image} alt={page.title} className="w-full h-auto" loading="lazy" decoding="async" />
          </div>
        </section>
      )}

      <section className="px-6 py-16 border-t border-ink/8">
        <div className="max-w-3xl mx-auto"><EditorialContent html={page.html_content} /></div>
      </section>

      <InstitutionalBlock />
    </SiteLayout>
  );
}
