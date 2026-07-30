import { Link } from "@tanstack/react-router";

type Props = {
  title: string;
  text?: string | null;
  buttonLabel?: string | null;
  buttonUrl?: string | null;
  secondaryLabel?: string | null;
  secondaryUrl?: string | null;
  variant?: string;
  imageUrl?: string | null;
};

function styles(variant: string) {
  switch (variant) {
    case "light":
      return { wrap: "bg-canvas border border-ink/10 text-ink", title: "text-ink", body: "text-muted-foreground", primary: "bg-ink text-canvas hover:opacity-90", secondary: "border border-ink/20 text-ink hover:bg-ink/5" };
    case "gold":
      return { wrap: "bg-accent text-ink", title: "text-ink", body: "text-ink/70", primary: "bg-ink text-canvas hover:opacity-90", secondary: "border border-ink/30 text-ink hover:bg-ink/10" };
    default:
      return { wrap: "bg-ink text-canvas", title: "text-canvas", body: "text-canvas/70", primary: "bg-canvas text-ink hover:opacity-90", secondary: "border border-canvas/30 text-canvas hover:bg-canvas/10" };
  }
}

function Action({ href, label, className }: { href: string; label: string; className: string }) {
  const cls = `inline-block text-xs uppercase tracking-widest px-5 py-3 transition ${className}`;
  if (/^https?:\/\//.test(href)) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{label}</a>;
  }
  return <Link to={href as never} className={cls}>{label}</Link>;
}

export function CtaBlockView({
  title, text, buttonLabel, buttonUrl, secondaryLabel, secondaryUrl, variant = "dark", imageUrl,
}: Props) {
  const s = styles(variant);
  return (
    <aside className={`${s.wrap} p-8 md:p-12`}>
      <div className="max-w-3xl">
        {imageUrl && <img src={imageUrl} alt="" loading="lazy" className="h-12 w-auto mb-6 object-contain" />}
        <h2 className={`font-serif text-2xl md:text-3xl ${s.title} text-balance`}>{title}</h2>
        {text && <p className={`mt-3 text-sm leading-relaxed ${s.body} whitespace-pre-line`}>{text}</p>}
        {(buttonLabel && buttonUrl) || (secondaryLabel && secondaryUrl) ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {buttonLabel && buttonUrl && <Action href={buttonUrl} label={buttonLabel} className={s.primary} />}
            {secondaryLabel && secondaryUrl && <Action href={secondaryUrl} label={secondaryLabel} className={s.secondary} />}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
