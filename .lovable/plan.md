# Módulo: Guia de Ruas e Avenidas de Alphaville (`/ruas`)

Este é um módulo de porte muito grande (banco + normalização + admin + páginas públicas + SEO técnico + relatórios + analytics). Vou executar em 10 fases sequenciais, cada uma validada antes de avançar.

## Decisão importante antes de começar

Já existe no projeto o módulo **`street_guides`** em `/guia-de-ruas-alphaville` (fase anterior desta mesma conversa), com:
- tabela `street_guides` + trigger de qualidade
- server functions públicas
- hub `/guia-de-ruas-alphaville` + página individual `/$slug`
- entrada no sitemap

O que você está pedindo agora é **um módulo mais completo e diferente**, em `/ruas`, com:
- vinculação automática de imóveis por normalização de endereço (não existe hoje)
- tabelas `streets`, `street_aliases`, `property_streets`, `seo_redirects` (novas)
- painel admin completo (CRUD + revisão de correspondências + relatórios)
- busca interna estendida, analytics, sitemap próprio

**Como quer proceder?**
- **Opção A (recomendada)**: aposentar `street_guides` / `/guia-de-ruas-alphaville`, criar redirect 301 para o novo `/ruas`, e concentrar tudo no módulo novo. Menos duplicação, um único lugar para SEO local por rua.
- **Opção B**: manter os dois. `guia-de-ruas-alphaville` continua como conteúdo editorial curado; `/ruas` vira o índice automático baseado em imóveis. Mais complexidade, risco de conteúdo duplicado e canibalização de SEO.
- **Opção C**: migrar dados de `street_guides` para `streets` e desligar o módulo antigo (mesma URL nova, mas preserva conteúdo já escrito).

Assumindo **Opção A** como default no plano abaixo. Confirme ou troque.

---

## Fase 1 — Banco de dados e normalização
- Migração criando `streets`, `street_aliases`, `property_streets`, `seo_redirects` (todas com GRANTs + RLS + policies conforme padrão do projeto).
- Índices em `slug`, `normalized_name`, `neighborhood_id`, `city`, `postal_code`, `property_streets.property_id`, `property_streets.street_id`.
- Função `public.normalize_street_text(text)` (unaccent + lower + expansão de abreviações Al./Av./R./Rod./Estr./Pça./Trav.).
- Trigger em `properties` (INSERT/UPDATE de endereço) chamando `public.match_property_streets(property_id)` que preenche `property_streets` com `match_type` e `match_confidence`.
- Extensão `unaccent` habilitada.
- Se Opção A/C: migração de dados de `street_guides` para `streets`.

## Fase 2 — Vinculação automática
- Server function `rematchAllProperties` (admin) para backfill.
- Cascata de matching: nome oficial → normalizado → alias → CEP → bairro+cidade → manual.
- Registrar confiança 100/90/80/70/<70.
- Fila "Imóveis sem rua identificada" (view/consulta admin).

## Fase 3 — Painel administrativo
- Menu **SEO Local > Ruas** em `admin.tsx`.
- Rotas `_authenticated/admin-ruas.tsx` (lista + filtros + indicadores) e `_authenticated/admin-ruas.$id.tsx` (editor por abas: Conteúdo, SEO, Localização, Apelidos, Relacionamentos, FAQ, Imóveis vinculados, Revisão).
- Ações: publicar/rascunho/arquivar/duplicar/destacar; validação `is_publishable`.
- Painel "Correspondências aguardando revisão" com botões Confirmar / Criar nova rua / Ignorar.

## Fase 4 — Página principal `/ruas`
- Hero + busca com autocomplete (nome, alias, bairro, CEP, condomínio).
- Ruas em destaque (cards `PremiumCard`), navegação alfabética A–Z, filtros (cidade, bairro, tipo, perfil, com imóveis).
- Blocos: Comerciais, Residenciais, Próximas a condomínios, Próximas a centros empresariais, Com salas/apartamentos/casas, Locação/Venda.
- Padrão visual premium (navy-deep + gold, mesmo padrão do restante do site).

## Fase 5 — Página individual `/ruas/$slug`
- Breadcrumb Cidade > Bairro > Rua.
- Hero com imagem própria (ou fallback institucional inteligente por região).
- Resumo da localização, seções editoriais condicionais (só renderiza se houver conteúdo).
- Bloco **Imóveis disponíveis** com filtros (venda/locação, tipo, preço, área, dorms, vagas) + paginação/lazy.
- Fallback quando não há imóveis: formulário de interesse + imóveis em ruas próximas + mesmo bairro.
- Condomínios relacionados, pontos próximos (só se cadastrados manualmente — não inventar), mapa, ruas próximas, bairros, blog relacionado, FAQ dinâmica, formulário de atendimento.

## Fase 6 — SEO técnico
- `head()` por rota: title, meta, canonical self-referente, OG/Twitter.
- JSON-LD: BreadcrumbList, Place, RealEstateAgent, ItemList (imóveis), FAQPage, ImageObject, LocalBusiness quando aplicável.
- Sitemap dedicado `/sitemap-ruas.xml` + inclusão no `sitemap.xml` principal.
- Redirects 301 via tabela `seo_redirects` (middleware no server).

## Fase 7 — Links internos
- Página de imóvel: exibir Rua/Bairro/Cidade/Condomínio como links.
- Página de bairro: seção "Principais ruas".
- Página de condomínio: rua + ruas próximas.
- Blog: campo para relacionar ruas.

## Fase 8 — Relatórios e analytics
- Relatórios admin: Ruas (imóveis, condomínios, views, leads, status SEO); Imóveis sem correspondência; Páginas fracas; Conversão.
- Eventos analytics: view, clique em imóvel/condomínio, filtro, busca, mapa, WhatsApp, telefone, form, navegação para rua próxima.

## Fase 9 — Revisão visual e responsividade
- Auditoria dos componentes novos em desktop/tablet/celular.
- Lazy-load de imagens, WebP, paginação, cache de queries.
- Acessibilidade (alt, contraste, teclado, labels, headings, breadcrumb acessível).

## Fase 10 — Auditoria final
- Rotas, slugs, redirects, links quebrados, canonical, schema, sitemap, performance, formulários, permissões admin.
- Popular as 23 ruas prioritárias como **rascunho** (nunca publicar automaticamente sem conteúdo).

---

## Detalhes técnicos-chave

- **Stack**: TanStack Start + Supabase (Lovable Cloud). Server fns em `src/lib/streets.functions.ts`; helpers em `src/lib/streets.server.ts`.
- **Client**: público via publishable client (RLS `TO anon` só nas colunas seguras). Admin via `requireSupabaseAuth` + `has_role('admin')`.
- **Normalização em SQL** (não em JS) para ficar disponível ao trigger e à busca; função `IMMUTABLE` para permitir índice funcional.
- **Sem invenção de dados**: pontos próximos, distâncias, história etc. só aparecem se preenchidos no admin.
- **Design**: reaproveitar `PremiumCard`, `PremiumPropertyCard`, tokens `navy-deep`/`gold`, tipografia serif — mesmo padrão premium do resto do site.

## Fora de escopo desta fase
- Integração real com Google Maps API (usa mapa estático/embed simples; API keys ficam para depois).
- IA para gerar conteúdo automático (gera sugestão como rascunho, mas nada é publicado sem revisão manual).
- PostGIS / cálculo de distância real por lat/lng (schema prevê os campos; matching desta fase usa texto normalizado + CEP + bairro).

---

## Confirme antes de eu começar

1. **Opção A, B ou C** para o módulo `street_guides` existente?
2. Posso prosseguir **Fase 1 primeiro** (migração + normalização + trigger), parar para você validar, e só então avançar? (recomendado — cada fase é grande)
3. Quer que eu já **desligue `/guia-de-ruas-alphaville` do menu** enquanto o novo módulo não estiver pronto, ou mantenho no ar até a Fase 5 concluir?
