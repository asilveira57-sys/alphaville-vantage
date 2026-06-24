## Diagnóstico do estado atual

O scraper (`src/lib/scraper.functions.ts`) já gera tudo no momento da coleta:
`descricao_seo`, `seo_title`, `seo_description`, `slug` amigável, `audit_status` e `audit_issues`. Porém:

- A abertura é **100% determinística** (template) — `seo_used_ai: false`.
- A IA na abertura **só** roda quando você clica em "Regerar SEO" com `useAI=true` (em `property-seo.functions.ts`).

Ou seja, do jeito que está hoje, depois do scrape você **precisaria** rodar "Regerar SEO com IA" para ter a abertura humanizada. Não é "uma coisa só".

## Objetivo

Tornar o scrape um processo único e definitivo: ao importar um imóvel, ele já sai do scraper com **abertura gerada por IA + bloco estruturado + título/descrição SEO + slug + auditoria**. Sem etapa manual depois.

## Mudanças

### 1. `src/lib/scraper.functions.ts`
- Importar `generateOpeningWithAI` (movido para um helper exportável em `property-seo.functions.ts` ou inlined no scraper como função local — vou inlined para evitar dependência cruzada).
- Antes do `buildSeoBody(seoSrc)`, chamar `await generateOpeningWithAI(seoSrc)` e passar o resultado: `buildSeoBody(seoSrc, opening)`.
- Gravar `seo_used_ai: !!opening` em vez de `false`.
- Se `LOVABLE_API_KEY` faltar ou a chamada falhar → fallback silencioso para abertura determinística (já é o comportamento de `generateOpeningWithAI`).

### 2. Orçamento de tempo
Cada chamada de IA leva ~1–2s. Com `REQUEST_DELAY_MS=350` + fetch + IA, cada imóvel custa ~2–3s. Dentro do `RUN_BUDGET_MS=50s` isso dá ~15–20 imóveis por execução. Como o scraper já prioriza URLs nunca vistas e roda incrementalmente, basta clicar "Rodar scraper" algumas vezes até cobrir todo o sitemap — **cada imóvel já sai 100% pronto na primeira vez** que é processado, sem necessidade de reprocessar.

Vou aumentar `RUN_BUDGET_MS` para `55_000` (worker tem 60s) para aproveitar melhor a janela.

### 3. Painel admin
- Manter o botão "Regerar SEO (todos)" só como ferramenta de manutenção futura (mudança de template, etc.), mas **deixar de ser obrigatório** no fluxo padrão.
- Acrescentar nota no painel: "O scraper já gera SEO+IA automaticamente. Regerar só é necessário se alterar o template."

## Resultado

Fluxo definitivo do usuário:
1. Clicar **"Rodar scraper"** no `/admin` — repetir até o contador parar de crescer.
2. Cada imóvel importado já vem com abertura IA + bloco estruturado + meta tags + slug + auditoria.
3. Olhar `/admin/audit` para validar qualidade.

Sem etapa de "regerar SEO". Sem reprocessar nada.

## Arquivos a editar
- `src/lib/scraper.functions.ts` — integrar IA na abertura + ajustar `seo_used_ai` + aumentar budget.
- `src/lib/property-seo.functions.ts` — exportar `generateOpeningWithAI` para reuso.
- `src/routes/_authenticated/admin.tsx` — texto auxiliar indicando que regerar é opcional.
