import { Link } from "@tanstack/react-router";
import { Phone, MessageCircle, Mail, MapPin } from "lucide-react";
import logoAsset from "@/assets/logo-sa-imoveis.png.asset.json";

export function SiteFooter() {
  return (
    <footer className="bg-brand-dark text-white/80">
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-16">
          <div className="md:col-span-1">
            <Link to="/" className="inline-block mb-6">
              <img
                src={logoAsset.url}
                alt="S.A Imóveis Alphaville"
                width={200}
                height={56}
                loading="lazy"
                decoding="async"
                className="h-14 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-sm leading-relaxed text-white/60 max-w-[34ch]">
              Corretora especializada em Alphaville, Tamboré, Barueri e Santana de Parnaíba.
              Aluga, vende, permuta, administra e reforma.
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-brand-yellow mb-5 font-semibold">
              Editorial
            </p>
            <ul className="space-y-3 text-sm">
              <li><Link to="/blog" className="hover:text-brand-yellow">Blog</Link></li>
              <li><Link to="/mercado-imobiliario" className="hover:text-brand-yellow">Mercado imobiliário</Link></li>
              <li><Link to="/historia" className="hover:text-brand-yellow">História</Link></li>
              <li><Link to="/meio-ambiente" className="hover:text-brand-yellow">Meio ambiente</Link></li>
              <li><Link to="/condominios" className="hover:text-brand-yellow">Condomínios</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-brand-yellow mb-5 font-semibold">
              Legal
            </p>
            <ul className="space-y-3 text-sm">
              <li><Link to="/politica-de-cookies" className="hover:text-brand-yellow">Política de Cookies</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-brand-yellow mb-5 font-semibold">
              Guias da região
            </p>
            <ul className="space-y-3 text-sm">
              <li><Link to="/guia-alphaville" className="hover:text-brand-yellow">Alphaville</Link></li>
              <li><Link to="/guia-tambore" className="hover:text-brand-yellow">Tamboré</Link></li>
              <li><Link to="/guia-barueri" className="hover:text-brand-yellow">Barueri</Link></li>
              <li><Link to="/guia-santana-de-parnaiba" className="hover:text-brand-yellow">Santana de Parnaíba</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-brand-yellow mb-5 font-semibold">
              Fale conosco
            </p>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="tel:+5511947888299" className="inline-flex items-center gap-2 hover:text-brand-yellow">
                  <Phone className="h-3.5 w-3.5" /> (11) 94788-8299
                </a>
              </li>
              <li>
                <a href="https://wa.me/5511995515053" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-brand-yellow">
                  <MessageCircle className="h-3.5 w-3.5" /> (11) 99551-5053
                </a>
              </li>
              <li>
                <a href="mailto:contato@saimoveisalphaville.com.br" className="inline-flex items-center gap-2 hover:text-brand-yellow">
                  <Mail className="h-3.5 w-3.5" /> contato@saimoveis…
                </a>
              </li>
              <li className="inline-flex items-start gap-2 text-white/60">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Alphaville · Barueri · SP</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-brand-yellow text-brand-dark">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-[11px] uppercase tracking-[0.2em] font-semibold">
            © {new Date().getFullYear()} S.A Imóveis Alphaville
          </p>
          <p className="text-[11px] uppercase tracking-[0.2em] font-medium">
            Aluga · Vende · Permuta · Administra · Reforma
          </p>
        </div>
      </div>
    </footer>
  );
}
