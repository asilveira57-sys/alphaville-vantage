import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="bg-canvas pt-24 pb-12 border-t border-ink/8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-24 mb-20">
          <div>
            <Link to="/" className="font-serif text-3xl tracking-tighter font-medium mb-8 block text-ink">
              S.A
            </Link>
            <p className="text-sm text-muted-foreground max-w-[34ch] leading-relaxed">
              Curadoria editorial e consultoria imobiliária especializada em Alphaville, Tamboré,
              Barueri e Santana de Parnaíba.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-12">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-6 font-medium">
                Editorial
              </p>
              <ul className="space-y-4 text-sm">
                <li><Link to="/blog" className="hover:text-muted-foreground">Blog</Link></li>
                <li><Link to="/mercado-imobiliario" className="hover:text-muted-foreground">Mercado</Link></li>
                <li><Link to="/historia" className="hover:text-muted-foreground">História</Link></li>
                <li><Link to="/meio-ambiente" className="hover:text-muted-foreground">Meio ambiente</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-6 font-medium">
                Guias
              </p>
              <ul className="space-y-4 text-sm">
                <li><Link to="/guia-alphaville" className="hover:text-muted-foreground">Alphaville</Link></li>
                <li><Link to="/guia-tambore" className="hover:text-muted-foreground">Tamboré</Link></li>
                <li><Link to="/guia-barueri" className="hover:text-muted-foreground">Barueri</Link></li>
                <li><Link to="/guia-santana-de-parnaiba" className="hover:text-muted-foreground">Santana de Parnaíba</Link></li>
              </ul>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-6 font-medium">
              Newsletter
            </p>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Receba nossa seleção mensal de artigos e oportunidades de investimento.
            </p>
            <form className="flex border-b border-ink/15" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="newsletter-email" className="sr-only">E-mail</label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="Seu e-mail"
                className="bg-transparent text-sm py-2 flex-grow outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                className="text-[10px] uppercase tracking-widest font-medium hover:text-muted-foreground"
              >
                Inscrever
              </button>
            </form>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-ink/8 gap-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            © {new Date().getFullYear()} S.A Imóveis Alphaville. Todos os direitos reservados.
          </p>
          <div className="flex gap-8">
            <a href="#" className="text-[10px] text-muted-foreground uppercase tracking-widest hover:text-ink transition-colors">
              Instagram
            </a>
            <a href="#" className="text-[10px] text-muted-foreground uppercase tracking-widest hover:text-ink transition-colors">
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
