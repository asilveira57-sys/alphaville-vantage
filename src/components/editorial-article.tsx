import { Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { EditorialContent } from "@/components/editorial-content";

interface Props {
  eyebrow: string;
  title: string;
  lead: string;
  parent: { label: string; to: string };
  html: string;
  related?: { label: string; to: string }[];
}

export function EditorialArticle({ eyebrow, title, lead, parent, html, related }: Props) {
  return (
    <SiteLayout>
      <section className="px-6 pt-16 md:pt-24 pb-12 border-b border-ink/8">
        <div className="max-w-4xl mx-auto">
          <nav aria-label="Trilha" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <li><Link to="/" className="hover:text-ink">Início</Link></li>
              <li className="flex items-center gap-2"><span aria-hidden>/</span><Link to={parent.to} className="hover:text-ink">{parent.label}</Link></li>
              <li className="flex items-center gap-2"><span aria-hidden>/</span><span className="text-ink">{title}</span></li>
            </ol>
          </nav>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6">{eyebrow}</p>
          <h1 className="font-serif text-4xl md:text-5xl font-medium leading-[1.05] tracking-tight text-balance">{title}</h1>
          <p className="mt-8 text-lg text-muted-foreground leading-relaxed max-w-[60ch] text-pretty">{lead}</p>
          <p className="mt-6 text-[10px] uppercase tracking-[0.25em] text-amber-700">Publicação simbólica · conteúdo provisório</p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <EditorialContent html={html} />
        </div>
      </section>

      {related && related.length > 0 && (
        <section className="px-6 py-16 border-t border-ink/8 bg-ink/[0.02]">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-serif text-2xl mb-8">Continue explorando</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {related.map((r) => (
                <li key={r.to} className="border-t border-ink/10 pt-4">
                  <Link to={r.to} className="font-serif text-xl hover:underline">{r.label} →</Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <InstitutionalBlock />
    </SiteLayout>
  );
}
