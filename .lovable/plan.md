## Contexto rápido

O `/sitemap.xml` já é gerado dinamicamente por rota de servidor (consulta `properties`, `editorial_pages` e rotas fixas). Não precisa "regenerar arquivo". O trabalho é dar **visibilidade + controle + notificação a buscadores**.

---

## O que será construído

### 1. Nova aba SEO no /admin
Nova rota `/_authenticated/admin/seo` (link no painel atual). Quatro blocos:

**a) Visão geral do sitemap**
- Cards com contagem por tipo: Institucionais, Imóveis ativos, Posts, Condomínios, Bairros — total.
- Data/hora do último purge de cache e da última notificação IndexNow.
- Link para abrir `/sitemap.xml` em nova aba.
- Botão **"Regenerar agora"** → purga cache + dispara IndexNow em lote das top URLs.

**b) Lista navegável de URLs indexáveis**
- Tabela paginada com: URL, tipo (institucional/imóvel/blog/condomínio/bairro), `lastmod`, status, botões "abrir" e "notificar IndexNow individual".
- Filtro por tipo e busca por slug.

**c) Auditoria SEO por página**
- Varre `editorial_pages` e `properties` procurando:
  - title ausente ou > 60 chars
  - meta description ausente ou > 160 chars
  - slug duplicado
  - canonical/OG faltando
  - imagem de capa ausente
- Tabela agrupada por severidade (erro/aviso) com link para editar no CMS.

**d) Histórico de execuções**
- Últimas notificações IndexNow (URL, status HTTP, timestamp) e execuções do cron mensal.

### 2. IndexNow automático na publicação
Toda vez que `editorial_pages.status` mudar para `published` ou `properties.status` mudar para `active` (ou o `updated_at` de um item já publicado mudar):
- Purge do cache do sitemap (via header ou timestamp em tabela `seo_state`).
- Chamada ao IndexNow (Bing/Yandex) notificando a URL específica.

Implementado através de:
- Server function `notifyIndexNow(urls[])` chamada pelos fluxos existentes de publicação (CMS save, scraper upsert).
- Chave IndexNow gerada automaticamente (`generate_secret`) e servida em `public/{key}.txt` via rota estática.

### 3. Cron mensal
Job `pg_cron` no dia 1º às 3h chamando `POST /api/public/hooks/seo-monthly-refresh`:
- Purga cache do sitemap.
- Envia lote IndexNow com todas as URLs ativas.
- Registra execução em `seo_runs`.
Rota protegida por `apikey` header (anon key), como o padrão de cron do projeto.

---

## Detalhes técnicos

**Novas tabelas (migração):**
- `seo_state` — 1 linha: `sitemap_purged_at`, `indexnow_last_run_at`.
- `seo_runs` — histórico: `id, kind ('indexnow' | 'monthly' | 'purge'), urls_count, http_status, error, created_at`.
- GRANTs para `authenticated` e `service_role`; RLS restrita a admins (`has_role`).

**Novos arquivos:**
- `src/routes/_authenticated/admin.seo.tsx` — UI da central.
- `src/lib/seo.functions.ts` — `getSeoOverview`, `listIndexableUrls`, `runSeoAudit`, `purgeSitemapCache`, `triggerIndexNow`, `listSeoRuns` (todas com `requireSupabaseAuth` + checagem admin).
- `src/lib/indexnow.server.ts` — cliente HTTP para `api.indexnow.org`.
- `src/routes/api/public/hooks/seo-monthly-refresh.ts` — endpoint do cron.
- `src/routes/api/public/{INDEXNOW_KEY}[.]txt.ts` — arquivo de verificação IndexNow (splat lê da env).

**Cache do sitemap:**
- A rota `/sitemap.xml` passa a ler `seo_state.sitemap_purged_at` e usar como `lastmod` global; o header `Cache-Control` cai para `max-age=300` + `stale-while-revalidate=3600` para reagir rápido ao purge sem hammering.

**Secret:**
- `INDEXNOW_KEY` — gerado via `generate_secret` (32 chars, hex). Sem ação do usuário.

**Integração com fluxos existentes:**
- No handler de save do CMS (`editorial.functions.ts`) e no scraper (`scraper.functions.ts`), após sucesso de publish/upsert, chamar `notifyIndexNow([url])` sem bloquear a resposta (fire-and-forget com log).

---

## Fora de escopo desta fase
- Editor visual de robots.txt e meta defaults (pode virar fase 2).
- Integração com Google Search Console API (Google descontinuou ping e exige OAuth por propriedade).
- Análise Semrush/backlinks (já existe ferramenta separada).

---

## Entregável
Ao final você terá uma aba SEO em `/admin/seo` onde:
- Vê tudo que está no sitemap.
- Aperta um botão e força atualização + notifica Bing na hora.
- O sistema faz isso sozinho a cada publicação e todo dia 1º do mês.
- Roda auditoria de meta tags para achar páginas com SEO incompleto.
