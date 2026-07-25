import { Link } from "@tanstack/react-router";

export type PostCtaBlockProps = {
  title?: string | null;
  text?: string | null;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
};

const DEFAULTS = {
  title: "Encontre o imóvel certo em Alphaville e região",
  text: "Curadoria de imóveis residenciais e comerciais em Alphaville, Tamboré, Barueri e Santana de Parnaíba.",
  buttonLabel: "Ver imóveis",
  buttonUrl: "/imoveis",
};

export function PostCtaBlock(props: PostCtaBlockProps) {
  const title = props.title?.trim() || DEFAULTS.title;
  const text = props.text?.trim() || DEFAULTS.text;
  const label = props.buttonLabel?.trim() || DEFAULTS.buttonLabel;
  const url = props.buttonUrl?.trim() || DEFAULTS.buttonUrl;
  const isExternal = /^https?:\/\//i.test(url);

  const ButtonEl = isExternal ? (
    <a
      href={url}
      className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-navy-deep transition hover:bg-gold-soft"
    >
      {label} →
    </a>
  ) : (
    <Link
      to={url as never}
      className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-navy-deep transition hover:bg-gold-soft"
    >
      {label} →
    </Link>
  );

  return (
    <section className="bg-navy-deep text-canvas px-6 py-16 md:py-20">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">S.A Imóveis Alphaville</p>
        <h2 className="font-serif text-3xl md:text-4xl font-medium mb-4 text-balance">{title}</h2>
        <p className="text-canvas/70 mb-8 max-w-[52ch] mx-auto leading-relaxed">{text}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {ButtonEl}
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-canvas transition hover:border-gold hover:text-gold"
          >
            Mais matérias
          </Link>
        </div>
      </div>
    </section>
  );
}
