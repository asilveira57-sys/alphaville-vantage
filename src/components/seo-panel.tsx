import { useMemo } from "react";

export type SeoValues = {
  title: string;
  description: string;
  keywords: string;
  slug: string;
  path: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  socialImage: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
};

export type SeoPanelProps = {
  values: SeoValues;
  onChange: (patch: Partial<SeoValues>) => void;
  fallbackTitle?: string;
  fallbackDescription?: string;
  fallbackImage?: string | null;
  siteUrl?: string;
  imageSlot?: React.ReactNode;
  children?: React.ReactNode;
};

const SITE = "https://alphaville-vantage.lovable.app";

const input = "w-full border border-ink/15 px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-ink";
const label = "block text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5";

function Counter({ value, ideal, max }: { value: string; ideal: number; max: number }) {
  const n = value.length;
  const tone = n === 0 ? "text-muted-foreground" : n > max ? "text-red-600" : n > ideal ? "text-amber-700" : "text-emerald-700";
  return <small className={`text-[11px] ${tone}`}>{n}/{ideal} ideal · máx. {max}</small>;
}

export function SeoPanel({
  values,
  onChange,
  fallbackTitle = "",
  fallbackDescription = "",
  fallbackImage = null,
  siteUrl = SITE,
  imageSlot,
  children,
}: SeoPanelProps) {
  const effective = useMemo(() => {
    const title = values.title.trim() || fallbackTitle.trim() || "Sem título";
    const description = values.description.trim() || fallbackDescription.trim() || "";
    const url = values.canonical.trim() || `${siteUrl}${values.path}`;
    const image = values.socialImage.trim() || fallbackImage || "";
    return {
      title,
      description,
      url,
      image,
      ogTitle: values.ogTitle.trim() || title,
      ogDescription: values.ogDescription.trim() || description,
    };
  }, [values, fallbackTitle, fallbackDescription, fallbackImage, siteUrl]);

  const robots = `${values.robotsIndex ? "index" : "noindex"}, ${values.robotsFollow ? "follow" : "nofollow"}`;

  return (
    <div className="space-y-8 max-w-4xl">
      {children}

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-ink">SEO e compartilhamento</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <label className={label}>Meta title</label>
            <input className={input} value={values.title} onChange={(e) => onChange({ title: e.target.value })} maxLength={80} />
            <Counter value={values.title} ideal={60} max={70} />
          </div>
          <div>
            <label className={label}>Meta description</label>
            <textarea className={input} rows={3} value={values.description} onChange={(e) => onChange({ description: e.target.value })} maxLength={200} />
            <Counter value={values.description} ideal={155} max={165} />
          </div>
          <div>
            <label className={label}>Palavras-chave</label>
            <input className={input} value={values.keywords} onChange={(e) => onChange({ keywords: e.target.value })} placeholder="alphaville, casa em condomínio" />
          </div>
          <div>
            <label className={label}>Canonical (opcional)</label>
            <input className={input} value={values.canonical} onChange={(e) => onChange({ canonical: e.target.value })} placeholder={`${siteUrl}${values.path}`} />
          </div>
          <div>
            <label className={label}>OG title (opcional)</label>
            <input className={input} value={values.ogTitle} onChange={(e) => onChange({ ogTitle: e.target.value })} placeholder={effective.title} />
          </div>
          <div>
            <label className={label}>OG description (opcional)</label>
            <textarea className={input} rows={3} value={values.ogDescription} onChange={(e) => onChange({ ogDescription: e.target.value })} placeholder={effective.description} />
          </div>
        </div>

        {imageSlot && (
          <div>
            <label className={label}>Imagem social (1200×630)</label>
            {imageSlot}
          </div>
        )}

        <div className="border border-ink/15 p-4 space-y-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Robots</p>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={values.robotsIndex} onChange={(e) => onChange({ robotsIndex: e.target.checked })} />
              Indexar esta página (index)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={values.robotsFollow} onChange={(e) => onChange({ robotsFollow: e.target.checked })} />
              Seguir links (follow)
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Tag aplicada: <code>{robots}</code>. Páginas com <code>noindex</code> são removidas do sitemap automaticamente.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-medium text-ink">Pré-visualização</h3>

        <div className="border border-ink/15 p-4 bg-white">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Google</p>
          <p className="text-[12px] text-[#4d5156] truncate">{effective.url}</p>
          <p className="text-[18px] text-[#1a0dab] leading-snug truncate">{effective.title.slice(0, 70)}</p>
          <p className="text-[13px] text-[#4d5156] leading-snug line-clamp-2">{effective.description.slice(0, 165) || "Sem descrição definida."}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-ink/15 overflow-hidden bg-white">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground px-4 pt-3">Facebook / LinkedIn</p>
            <div className="aspect-[1200/630] bg-ink/5 mt-2">
              {effective.image
                ? <img src={effective.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                : <div className="h-full w-full grid place-items-center text-[11px] text-muted-foreground">Sem imagem social</div>}
            </div>
            <div className="p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{effective.url.replace(/^https?:\/\//, "").split("/")[0]}</p>
              <p className="text-sm font-medium text-ink line-clamp-2">{effective.ogTitle}</p>
              <p className="text-[12px] text-muted-foreground line-clamp-2">{effective.ogDescription}</p>
            </div>
          </div>

          <div className="border border-ink/15 p-4 bg-[#e5ddd5]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">WhatsApp</p>
            <div className="bg-white rounded-lg overflow-hidden max-w-[320px] shadow-sm">
              {effective.image && <img src={effective.image} alt="" className="w-full aspect-[1200/630] object-cover" loading="lazy" />}
              <div className="p-3">
                <p className="text-[13px] font-medium text-ink line-clamp-2">{effective.ogTitle}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{effective.ogDescription}</p>
                <p className="text-[11px] text-muted-foreground mt-1 truncate">{effective.url}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
