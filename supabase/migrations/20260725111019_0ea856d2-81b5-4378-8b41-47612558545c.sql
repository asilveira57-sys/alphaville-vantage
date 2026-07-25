
-- 1. Colunas novas
ALTER TABLE public.editorial_pages
  ADD COLUMN IF NOT EXISTS hero_eyebrow text,
  ADD COLUMN IF NOT EXISTS cards jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Ampliar content_type para incluir 'hub'
ALTER TABLE public.editorial_pages DROP CONSTRAINT IF EXISTS editorial_pages_content_type_check;
ALTER TABLE public.editorial_pages
  ADD CONSTRAINT editorial_pages_content_type_check
  CHECK (content_type = ANY (ARRAY['condominio','bairro','cidade','guia','blog','institucional','hub']::text[]));

-- 3. Seed das 5 páginas-hub (idempotente por slug)
INSERT INTO public.editorial_pages
  (slug, title, content_type, status, hero_eyebrow, excerpt, cards, meta_title, meta_description, published_at)
VALUES
  ('guia-alphaville', 'Alphaville em profundidade', 'hub', 'published',
   'Guia Regional',
   'O dossiê completo sobre o primeiro grande complexo de condomínios fechados do Brasil: história, residenciais, escolas, gastronomia, lazer e mercado imobiliário.',
   '[
      {"eyebrow":"Residenciais","title":"Os primeiros condomínios","lead":"Como surgiram os Residenciais 1, 2 e 3 e por que continuam icônicos.","to":"/artigos/alphaville-residenciais-pioneiros"},
      {"eyebrow":"Educação","title":"Principais escolas particulares","lead":"Da educação infantil ao ensino médio bilíngue.","to":"/artigos/alphaville-escolas"},
      {"eyebrow":"Gastronomia","title":"Restaurantes do Calçadão","lead":"Da culinária autoral às pizzarias clássicas.","to":"/artigos/alphaville-calcadao"},
      {"eyebrow":"Lazer","title":"Parques e clubes","lead":"Estrutura esportiva, áreas verdes e centros sociais.","to":"/artigos/alphaville-parques-clubes"},
      {"eyebrow":"Mobilidade","title":"Castelo Branco e Rodoanel","lead":"Acessos, fluxo e o futuro da mobilidade local.","to":"/artigos/alphaville-mobilidade"},
      {"eyebrow":"Saúde","title":"Hospitais e clínicas de referência","lead":"Rede médica que atende a região.","to":"/artigos/alphaville-saude"}
    ]'::jsonb,
   'Guia Alphaville — S.A Imóveis Alphaville',
   'Guia completo de Alphaville: condomínios, escolas, gastronomia, lazer, mobilidade e qualidade de vida.',
   now()),

  ('guia-barueri', 'Barueri em profundidade', 'hub', 'published',
   'Guia Regional',
   'Mais que cidade-sede de Alphaville, Barueri é um dos maiores polos corporativos do país. Conheça sua história, benefícios fiscais, empresas instaladas e a infraestrutura que sustenta a região.',
   '[
      {"eyebrow":"Economia","title":"Benefícios fiscais de Barueri","lead":"Por que empresas escolhem se instalar na cidade.","to":"/artigos/barueri-beneficios-fiscais"},
      {"eyebrow":"Empresas","title":"Grandes corporações instaladas","lead":"Panorama do mercado de trabalho local.","to":"/artigos/barueri-corporacoes"},
      {"eyebrow":"Mobilidade","title":"Castelo Branco e Rodoanel","lead":"Eixos de acesso e o futuro do transporte.","to":"/artigos/barueri-mobilidade"}
    ]'::jsonb,
   'Guia Barueri — S.A Imóveis Alphaville',
   'Guia completo de Barueri: história, mercado corporativo, benefícios fiscais, mobilidade e qualidade de vida.',
   now()),

  ('guia-tambore', 'Tamboré em profundidade', 'hub', 'published',
   'Guia Regional',
   'Considerada uma das regiões de maior valorização do estado de São Paulo, o Tamboré reúne residenciais com arquitetura contemporânea, clubes privativos e infraestrutura de excelência.',
   '[
      {"eyebrow":"Residenciais","title":"Tamboré 1 ao 11","lead":"Diferenças, perfis e dinâmica de preços.","to":"/artigos/tambore-residenciais"},
      {"eyebrow":"Clubes","title":"Estrutura esportiva e social","lead":"Golfe, equitação, tênis e clubes familiares.","to":"/artigos/tambore-clubes"},
      {"eyebrow":"Mercado","title":"Valorização e liquidez","lead":"Por que o Tamboré tem o m² mais disputado.","to":"/artigos/tambore-mercado"}
    ]'::jsonb,
   'Guia Tamboré — S.A Imóveis Alphaville',
   'Guia completo do Tamboré: residenciais de luxo, clubes, escolas e mercado imobiliário em valorização.',
   now()),

  ('guia-santana-de-parnaiba', 'Santana de Parnaíba em profundidade', 'hub', 'published',
   'Guia Regional',
   'Um dos centros históricos mais bem preservados do estado convive com condomínios de alto padrão e uma cena gastronômica em ascensão. Conheça a cidade que une tradição colonial e sofisticação contemporânea.',
   '[
      {"eyebrow":"História","title":"Centro histórico tombado","lead":"Casarões coloniais, igrejas e o legado bandeirante.","to":"/artigos/santana-centro-historico"},
      {"eyebrow":"Condomínios","title":"Novos residenciais","lead":"Onde Santana cresce e por que atrai novos moradores.","to":"/artigos/santana-residenciais"},
      {"eyebrow":"Gastronomia","title":"Restaurantes premiados","lead":"Da culinária tradicional aos novos endereços autorais.","to":"/artigos/santana-restaurantes"}
    ]'::jsonb,
   'Guia Santana de Parnaíba — S.A Imóveis Alphaville',
   'Guia completo de Santana de Parnaíba: centro histórico tombado, gastronomia, condomínios e mercado imobiliário.',
   now()),

  ('mercado-imobiliario', 'Mercado imobiliário da região', 'hub', 'published',
   'Mercado',
   'Análises, dados e perspectivas sobre o mercado imobiliário de alto padrão em Alphaville e arredores. Valorização, liquidez e movimentos do segmento residencial e corporativo.',
   '[
      {"eyebrow":"Valorização","title":"Condomínios mais valorizados","lead":"Ranking editorial baseado em dados de transação.","to":"/artigos/mercado-condominios-valorizados"},
      {"eyebrow":"Locação","title":"Locação de alto padrão","lead":"Cenário, tickets e perfis de inquilino.","to":"/artigos/mercado-locacao"},
      {"eyebrow":"Corporativo","title":"Mercado corporativo","lead":"Salas comerciais, galpões e o eixo Castelo Branco.","to":"/artigos/mercado-corporativo"}
    ]'::jsonb,
   'Mercado Imobiliário de Alphaville — S.A Imóveis Alphaville',
   'Análises de mercado imobiliário em Alphaville, Tamboré, Barueri e Santana de Parnaíba: valorização, liquidez e oportunidades.',
   now())
ON CONFLICT (slug) DO NOTHING;
