
CREATE TABLE public.editorial_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL CHECK (content_type IN ('condominio','bairro','cidade','guia','blog','institucional')),
  excerpt TEXT,
  html_content TEXT NOT NULL DEFAULT '',
  featured_image TEXT,
  gallery_images TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  related_neighborhood TEXT,
  related_condominium UUID REFERENCES public.condominiums(id) ON DELETE SET NULL,
  meta_title TEXT,
  meta_description TEXT,
  focus_keyword TEXT,
  secondary_keywords TEXT[] NOT NULL DEFAULT '{}',
  canonical_url TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  schema_type TEXT NOT NULL DEFAULT 'Article' CHECK (schema_type IN ('Article','BlogPosting','Place','Residence','LocalBusiness')),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

GRANT SELECT ON public.editorial_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.editorial_pages TO authenticated;
GRANT ALL ON public.editorial_pages TO service_role;

ALTER TABLE public.editorial_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published pages"
  ON public.editorial_pages FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY "Auth can read published or admin all"
  ON public.editorial_pages FOR SELECT TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage editorial pages"
  ON public.editorial_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX editorial_pages_type_status_idx ON public.editorial_pages (content_type, status, display_order, published_at DESC);
CREATE INDEX editorial_pages_tags_idx ON public.editorial_pages USING GIN (tags);

CREATE TRIGGER editorial_pages_updated_at
  BEFORE UPDATE ON public.editorial_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seeds (6 condomínios iniciais)
INSERT INTO public.editorial_pages (title, slug, content_type, excerpt, html_content, status, is_featured, display_order, tags, related_neighborhood, meta_title, meta_description, focus_keyword, schema_type, published_at)
VALUES
('Residencial 1 — Alphaville', 'residencial-1', 'condominio',
 'Um dos primeiros e mais tradicionais condomínios de Alphaville, com lotes amplos e infraestrutura consolidada.',
 '<h1>Residencial 1 — Alphaville</h1><p>O <strong>Residencial 1</strong> é um marco histórico de Alphaville, inaugurado nas primeiras fases do bairro. Reúne lotes generosos, ruas arborizadas e uma das melhores infraestruturas de lazer e segurança da região.</p><h2>Características</h2><ul><li>Lotes a partir de 800 m²</li><li>Segurança 24h com portaria e ronda</li><li>Áreas de lazer completas</li></ul><h2>Localização</h2><p>Próximo à Alameda Rio Negro, com fácil acesso à Castello Branco e ao centro comercial de Alphaville. Veja também nosso <a href="/alphaville">guia de Alphaville</a>.</p>',
 'published', true, 1, ARRAY['alphaville','residencial','tradicional'], 'Alphaville',
 'Residencial 1 Alphaville — Casas e terrenos | SA Imóveis',
 'Conheça o Residencial 1 de Alphaville: lotes amplos, infraestrutura consolidada e ótima localização. Veja imóveis à venda e para locação.',
 'residencial 1 alphaville', 'Place', now()),

('Residencial 10 — Alphaville', 'residencial-10', 'condominio',
 'Condomínio de alto padrão no coração de Alphaville, próximo a escolas e centros comerciais.',
 '<h1>Residencial 10 — Alphaville</h1><p>O <strong>Residencial 10</strong> é referência em sofisticação e estilo de vida em Alphaville. Conta com casas modernas, ampla área verde e estrutura de lazer premium.</p><h2>Diferenciais</h2><ul><li>Casas de alto padrão</li><li>Quadra poliesportiva, piscina e salão de festas</li><li>Proximidade a colégios renomados</li></ul><p>Confira também o <a href="/condominios/residencial-1">Residencial 1</a> e nosso <a href="/alphaville">guia completo de Alphaville</a>.</p>',
 'published', true, 2, ARRAY['alphaville','residencial','alto-padrao'], 'Alphaville',
 'Residencial 10 Alphaville — Casas de alto padrão | SA Imóveis',
 'Residencial 10 de Alphaville: casas de alto padrão, lazer completo e localização privilegiada. Veja imóveis disponíveis.',
 'residencial 10 alphaville', 'Place', now()),

('Tamboré 11 — Condomínio', 'tambore-11', 'condominio',
 'Um dos mais exclusivos condomínios da região de Tamboré, com casas de altíssimo padrão.',
 '<h1>Tamboré 11</h1><p>O <strong>Tamboré 11</strong> está entre os condomínios mais exclusivos da região metropolitana. Casas com projeto arquitetônico assinado, terrenos amplos e lazer completo.</p><h2>Por que morar no Tamboré 11</h2><ul><li>Segurança máxima</li><li>Casas com 600 m² ou mais</li><li>Áreas verdes preservadas</li></ul><p>Veja também o <a href="/alphaville">guia de Alphaville</a> e nosso <a href="/blog">blog</a> sobre o mercado local.</p>',
 'published', true, 3, ARRAY['tambore','alto-padrao','exclusivo'], 'Tamboré',
 'Tamboré 11 — Casas de altíssimo padrão | SA Imóveis',
 'Tamboré 11: um dos condomínios mais exclusivos da região, com casas de alto padrão e infraestrutura premium.',
 'tambore 11', 'Place', now()),

('Gênesis 1 e 2 — Alphaville', 'genesis', 'condominio',
 'Os condomínios Gênesis 1 e 2 oferecem casas modernas em ambiente arborizado e seguro.',
 '<h1>Gênesis 1 e 2</h1><p>Os condomínios <strong>Gênesis 1 e 2</strong> são reconhecidos pela arquitetura moderna e pela qualidade de vida proporcionada aos moradores. Casas amplas, áreas verdes e lazer completo.</p><h2>Infraestrutura</h2><ul><li>Piscina, sauna e academia</li><li>Quadras esportivas</li><li>Playground e salão de festas</li></ul><p>Conheça também o <a href="/condominios/tambore-11">Tamboré 11</a>.</p>',
 'published', true, 4, ARRAY['alphaville','genesis','moderno'], 'Alphaville',
 'Gênesis 1 e 2 Alphaville — Casas modernas | SA Imóveis',
 'Condomínios Gênesis 1 e 2 em Alphaville: casas modernas, lazer completo e segurança.',
 'genesis alphaville', 'Place', now()),

('Alphaville Zero', 'alphaville-zero', 'condominio',
 'O conceito mais recente de moradia em Alphaville, com design contemporâneo e sustentabilidade.',
 '<h1>Alphaville Zero</h1><p>O <strong>Alphaville Zero</strong> traz um novo conceito de moradia, com foco em sustentabilidade, tecnologia e design contemporâneo. Casas inteligentes e áreas comuns repensadas.</p><h2>Destaques</h2><ul><li>Casas com automação completa</li><li>Soluções sustentáveis</li><li>Lazer de resort</li></ul><p>Veja também <a href="/condominios/genesis">Gênesis</a> e o <a href="/alphaville">guia de Alphaville</a>.</p>',
 'published', true, 5, ARRAY['alphaville','novo','sustentavel'], 'Alphaville',
 'Alphaville Zero — Moradia contemporânea e sustentável | SA Imóveis',
 'Alphaville Zero: o conceito mais recente de moradia em Alphaville, com automação, sustentabilidade e design.',
 'alphaville zero', 'Place', now()),

('Edifícios Verticais de Alphaville', 'edificios-verticais', 'condominio',
 'Conheça os principais edifícios residenciais verticais de Alphaville, com apartamentos modernos e infraestrutura completa.',
 '<h1>Edifícios Verticais de Alphaville</h1><p>Alphaville também é casa de <strong>edifícios verticais</strong> de altíssimo padrão, ideais para quem busca praticidade sem abrir mão da exclusividade.</p><h2>Vantagens da vida vertical</h2><ul><li>Infraestrutura de lazer completa</li><li>Segurança e portaria 24h</li><li>Localização estratégica</li></ul><p>Confira também os <a href="/condominios/residencial-1">condomínios horizontais</a> e nosso <a href="/blog">blog</a>.</p>',
 'published', true, 6, ARRAY['alphaville','vertical','apartamento'], 'Alphaville',
 'Edifícios verticais de Alphaville — Apartamentos de alto padrão | SA Imóveis',
 'Edifícios verticais em Alphaville: apartamentos modernos com infraestrutura e localização premium.',
 'apartamentos alphaville', 'Place', now());
