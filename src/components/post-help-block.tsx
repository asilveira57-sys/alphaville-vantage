import { Link } from "@tanstack/react-router";

export type PostHelpBlockProps = {
  title?: string | null;
  text?: string | null;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
  /** Contexto do post (categoria, cidade, tema). Usado internamente para variações futuras. */
  context?: string | null;
};

const DEFAULTS = {
  title: "Como a S.A. Imóveis pode ajudar",
  text: "A S.A. Imóveis atua em Alphaville, Barueri e Santana de Parnaíba e pode ajudar na busca por imóveis compatíveis com sua localização, orçamento e objetivo.",
  buttonLabel: "Ver imóveis disponíveis",
  buttonUrl: "/imoveis",
};

export function PostHelpBlock(props: PostHelpBlockProps) {
  const title = props.title?.trim() || DEFAULTS.title;
  const text = props.text?.trim() || DEFAULTS.text;
  const label = props.buttonLabel?.trim() || DEFAULTS.buttonLabel;
  const url = props.buttonUrl?.trim() || DEFAULTS.buttonUrl;
  const isExternal = /^https?:\/\//i.test(url);

  return (
    <aside
      className="not-prose my-12 border border-ink/10 bg-ink/[0.03] rounded-sm px-6 py-8 md:px-10 md:py-10"
      aria-label={title}
    >
      <p className="text-[10px] uppercase tracking-[0.25em] text-gold mb-3">S.A. Imóveis</p>
      <h2 className="font-serif text-2xl md:text-3xl text-ink leading-tight mb-3">{title}</h2>
      <p className="text-ink/80 leading-relaxed max-w-[62ch] mb-6">{text}</p>
      {isExternal ? (
        <a
          href={url}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-canvas transition hover:bg-ink/85"
        >
          {label} →
        </a>
      ) : (
        <Link
          to={url as never}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-canvas transition hover:bg-ink/85"
        >
          {label} →
        </Link>
      )}
    </aside>
  );
}
