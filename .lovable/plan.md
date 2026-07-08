
# Fase: SEO Local por Ruas, Avenidas e Alamedas

Módulo completo de "Guia de Ruas de Alphaville" — páginas SEO locais conectadas aos imóveis cadastrados, com CRUD administrativo, regras de qualidade e schema estruturado.

## 1. Modelo de dados (Lovable Cloud)

Nova tabela `street_guides` com:

- Identificação: `slug` (único), `name`, `via_type` (alameda / avenida / rua / região / calçada), `city`, `region`, `neighborhood`
- Conteúdo editorial: `short_description`, `long_description`, `profile_tags` (array: residencial, comercial, corporativa, mista, próxima-a-condomínios, etc.), `nearby_points` (JSONB estruturado), `intro_text`, `faq` (JSONB `[{q, a}]`), `sources` (JSONB)
- SEO: `seo_title`, `meta_description`, `h1`, `og_image`, `canonical_override`, `seo_priority` (0-100), `display_order`
- Relacionamentos: `related_condo_ids` (uuid[]), `related_property_ids` (uuid[]), `related_street_ids` (uuid[]), `related_regions` (text[])
- Geo opcional: `latitude`, `longitude`, `search_radius_km`
- Publicação: `status` (`draft` | `published` | `hidden`), `published_at`, `updated_at`, `created_at`, `created_by`
- Regra de qualidade (função `is_publishable(street_guides)`): exige name + city/region + short + long + h1 + seo_title + meta_description + ≥1 relacionamento. Trigger bloqueia `status='published'` se falhar.

RLS: leitura pública apenas para `status='published'`; leitura/escrita completa para admin (via `has_role`).

Tabela auxiliar `street_suggestions` (opcional): agrega ruas recorrentes extraídas de `properties.address` para sugerir novas páginas ao admin (sem publicar automaticamente).

## 2. Rotas públicas

- `src/routes/guia-de-ruas-alphaville.tsx` (layout `<Outlet/>`)
- `src/routes/guia-de-ruas-alphaville.index.tsx` — hub com 8 blocos:
  1. Principais alamedas comerciais
  2. Avenidas de acesso e ligação
  3. Ruas próximas a condomínios residenciais
  4. Próximas ao Centro Comercial Alphaville
  5. Próximas ao Tamboré
  6. Próximas a Santana de Parnaíba
  7. Próximas a Barueri
  8. Próximas à Aldeia da Serra
- `src/routes/guia-de-ruas-alphaville.$slug.tsx` — página individual, com:
  - Hero premium (nome + tipo + região + imagem/mapa)
  - Breadcrumbs
  - Resumo da localização, perfil da região, quem busca imóveis ali
  - Pontos de referência (renderização condicional só se houver dados)
  - Tipos de imóveis (derivado dos imóveis relacionados)
  - **Bloco dinâmico "Imóveis próximos à [rua]"** com cascata:
    1. Imóveis na própria rua (match em `properties.address` / `neighborhood` / `condo_id` / relação manual)
    2. Fallback: mesma região/bairro
    3. Fallback: bloco institucional com CTA (nunca vazio)
  - Filtros locais (comprar/alugar/tipo/faixa de valor/dorm/vagas/área) — usam `PropertyFilters` reaproveitado, escopo à página
  - Links internos obrigatórios (guias, categorias, condomínios próximos, outras ruas)
  - FAQ dinâmico (perguntas padrão + FAQ manual)
  - CTA final consultivo (Ver imóveis / Falar / WhatsApp)

Server functions em `src/lib/street-guides.functions.ts`:
- `listPublishedStreetGuides` (público, publishable client)
- `getStreetGuideBySlug` (público)
- `listStreetGuidesForAdmin`, `upsertStreetGuide`, `deleteStreetGuide` (admin, `requireSupabaseAuth` + `has_role('admin')`)
- `findPropertiesNearStreet(streetId)` (público) — aplica cascata acima
- `suggestStreetsFromProperties` (admin) — extração de ruas recorrentes

## 3. Head, schema e sitemap

Cada página individual:
- `title`, `description`, `og:*`, `canonical` self-referente
- JSON-LD: `Article` + `BreadcrumbList` + `FAQPage` + `Place` (com `containedInPlace` = cidade) + `RealEstateAgent` quando aplicável

Sitemap (`src/routes/sitemap[.]xml.ts`): adicionar `/guia-de-ruas-alphaville` + loop por `street_guides` publicadas.

`autoNotifyPublish` já existente em editorial: replicar no `upsertStreetGuide` para invalidar cache + IndexNow ao publicar/atualizar.

## 4. Admin — "SEO Local por Ruas"

Novo item em `admin.tsx`:
- `src/routes/_authenticated/admin-seo-ruas.tsx` — lista com filtros (status/cidade/tipo), busca, ações rápidas (publicar/rascunho/ocultar), badge de qualidade (mostrando quais campos faltam para publicar)
- `src/routes/_authenticated/admin-seo-ruas.$id.tsx` — editor completo:
  - Aba Conteúdo: nome, slug (auto-gerado, editável), via_type, cidade, região, descrições, perfil (multi-select), pontos próximos (repeater)
  - Aba SEO: title, meta, H1, intro, og_image (upload via bucket `editorial-images`), prioridade, ordem
  - Aba Relacionamentos: condomínios (multi-select via `related-select`), imóveis (multi-select), outras ruas, regiões
  - Aba FAQ: repeater `[{q,a}]`
  - Aba Sugestões: preview das perguntas padrão renderizadas
  - Rodapé: status + botão Publicar (desabilitado se `is_publishable` = false, com lista de pendências)

Sugestão automática: aba separada listando ruas frequentes extraídas de `properties`, cada uma com "Criar rascunho".

## 5. Busca interna

Estender a busca existente para retornar, ao pesquisar por nome de rua:
- Página guia da rua (se existir)
- Imóveis com `address ILIKE %rua%`
- Condomínios relacionados
- Posts editoriais que citam a rua

## 6. Priorização inicial (rollout de conteúdo)

Nenhuma página publicada automaticamente. Após implementação, criar 15–30 rascunhos vazios com nome+slug+cidade das ruas listadas (Rio Negro, Araguaia, Madeira, Mamoré, Yojiro Takaoka, Marcos Penteado, Alphaville, Sagitário, Copacabana, Grajaú, América, Ásia, Europa, África, Oceania, Calçada das Orquídeas, Centro Comercial, Tamboré, Aldeia da Serra) — o admin completa o conteúdo antes de publicar.

## 7. Design

Reaproveitar `PremiumCard`, `PremiumPropertyCard`, tokens `navy-deep`/`gold`/`canvas`, tipografia serif — mesmo padrão da página `/alphaville` recém-redesenhada. Nada de aparência de blog automático.

## Detalhes técnicos

- Migração única com: `CREATE TABLE public.street_guides`, GRANTs (`SELECT` para `anon` e `authenticated`; `ALL` para `service_role` + `INSERT/UPDATE/DELETE` para `authenticated`), RLS, políticas (`SELECT` público em published; ALL para admin via `has_role`), função `is_publishable`, trigger de validação de publicação, trigger `set_updated_at`.
- Server fns públicas usam server publishable client (não `supabaseAdmin`) para respeitar RLS.
- Loader das rotas públicas via `ensureQueryData` + `useSuspenseQuery` (padrão do projeto).
- Filtros locais na página da rua: search params validados (mesmo padrão de `/imoveis`).
- Novo `og:image` só em rotas leaf (nunca `__root`).
- Sitemap: incluir apenas `status='published'`.

## Fora de escopo desta fase

- Geolocalização real com PostGIS / cálculo de distância por lat/lng (o schema prevê os campos, mas a busca "próximos" desta fase usa relacionamento manual + match textual de endereço/bairro/condomínio; PostGIS entra em fase posterior se necessário).
- Geração automática de descrições via IA (o admin escreve; podemos adicionar assistente na próxima fase).
- Mapa interativo embarcado (usa imagem estática nesta fase; embed do Google Maps fica para depois).

## Entrega em etapas

Para não ficar gigantesco em um único turno, sugiro dividir em 3 PRs sequenciais:

1. **PR1 — Fundação**: migração + server functions + rotas públicas (hub + página individual) + schema/sitemap. Sem admin ainda; publicação manual via SQL de teste.
2. **PR2 — Admin**: lista + editor completo + upload de capa + validação de qualidade + botão publicar/rascunho + IndexNow.
3. **PR3 — Sugestões e busca**: aba de sugestões automáticas a partir de `properties` + integração com busca interna do site.

Confirme se quer que eu siga por essa divisão (começando pelo PR1) ou se prefere outro ordenamento.
