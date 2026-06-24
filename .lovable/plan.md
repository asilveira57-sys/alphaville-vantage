# Fase 2 — Filtros em /imoveis  &  Fase 3 — Edição de revisão por imóvel

Reaproveita o que já existe (`reprocessProperties`, `saveManualReview`, `listAuditProperties`, `getScrapAudit`) e completa as duas fases sem mexer em parser, scraper ou motor SEO.

---

## Fase 2 — /imoveis com filtros + ordenação + WhatsApp

### 2.1 Estado dos filtros na URL (TanStack Router + Zod)

Em `src/routes/imoveis.index.tsx`, adicionar `validateSearch` com `zodValidator` + `fallback` (regras do TanStack search params). Schema:

```text
purpose      "sale" | "rent" | "both" | ""           (default "")
type         string  (property_type)                  (default "")
city         string                                   (default "")
neighborhood string                                   (default "")
condo        string  (condominium_name)               (default "")
bedrooms     number  (mínimo de dormitórios; 0=todos) (default 0)
parking      number  (mínimo de vagas; 0=todos)       (default 0)
priceMin     number  (default 0)
priceMax     number  (default 0  → sem teto)
areaMin      number  (default 0)
sort         "recent" | "price_asc" | "price_desc" | "area_desc"  (default "recent")
q            string  (busca textual)                  (default "")
```

Tudo lido via `Route.useSearch()` e gravado com `navigate({ search: (prev) => ({ ...prev, ... }) })` para preservar restante.

### 2.2 Loader: derivar opções + aplicar filtros

Loader continua chamando Supabase, mas:
- Busca tudo `status='active'` (91 hoje, pequeno) **uma vez** e devolve `{ items, options }`.
- `options` é calculado no servidor a partir do conjunto retornado:
  - `types`, `cities`, `neighborhoods`, `condos` → arrays únicos ordenados
  - `priceSaleMax`, `priceRentMax`, `areaMax`, `bedroomsMax`, `parkingMax`
- Filtragem é client-side (com 91 itens, sem custo).
- `loaderDeps` não usa search; filtros são aplicados em render via `useMemo`.

Por que client-side: o usuário muda filtros constantemente e o conjunto cabe em memória; evita refetch e dá feedback imediato.

### 2.3 UI — 3 linhas de filtros (layout estilo site original)

Componente novo `src/components/property-filters.tsx`, fundo `bg-brand-dark` (faixa escura como no site oficial), inputs com fundo cinza-grafite, botão "BUSCAR" amarelo.

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [ Finalidade ▾ ] [ Tipo ▾ ]    [ Cidade ▾ ]   [ Bairro ▾ ]    [BUSCAR]│   linha 1
│ [ Valor de ▾  ] [ até ▾  ]    [ Dormitórios ▾] [ Vagas ▾ ]            │   linha 2
│ [ Condomínio ▾ ]              [ Área mín. ▾]   [ Ordenar por ▾ ]      │   linha 3
└────────────────────────────────────────────────────────────────────────┘
```

- Selects = `<select>` nativo estilizado (sem dependências; UX confiável em mobile).
- "Finalidade", "Tipo", "Cidade", "Bairro", "Condomínio" populados a partir de `options`.
- "Valor de/até" exibe faixas pré-definidas derivadas do max (R$ 500k, 1M, 2M, 5M, 10M+ ou R$ 2k, 5k, 10k, 20k+ se finalidade=rent).
- "Ordenar por": Recentes · Menor preço · Maior preço · Maior área.
- Campo de busca textual `q` opcional, escondido em um `<details>` "Busca avançada" para não poluir.
- Botão "Limpar filtros" aparece quando há qualquer filtro ativo.
- Chip-row abaixo da faixa exibe filtros ativos ("Tamboré ✕", "3+ dorm ✕"), cada um remove o filtro ao clicar.

### 2.4 Aplicação dos filtros (puro em memória)

`useMemo` aplica em ordem:
1. `purpose` → casa com `p.purpose` (`both` aceita os dois).
2. `type` → `property_type === type`.
3. `city` / `neighborhood` / `condo` → match exato.
4. `bedrooms` → `p.bedrooms >= bedrooms`.
5. `parking` → `(p.parking_covered+p.parking_uncovered) || p.parking >= parking`.
6. `priceMin/priceMax` → considera `price_sale` se purpose=sale, `price_rent` se purpose=rent, qualquer um se vazio/both.
7. `areaMin` → max(`area_useful`,`area_built`,`area_total`) `>= areaMin`.
8. `q` → busca insensitive em `title`, `condominium_name`, `neighborhood`, `seo_title`.
9. `sort` → reordena.

Contador "X de Y imóveis" no topo da grade.

### 2.5 Cards com WhatsApp

Manter o card já no estilo da marca (faixa preta com preço amarelo, botão amarelo "Ver imóvel"). Adicionar um segundo CTA em cada card:

```text
┌──────────────────┐
│   [foto]         │
│   VENDA · R$ X   │
├──────────────────┤
│ Tipo · Bairro    │
│ Título           │
│ 3 dorm · 2 vagas │
├──────────────────┤
│  [ Ver imóvel ]  │  ← amarelo
│  [📱 WhatsApp ]  │  ← verde WhatsApp, abre wa.me com texto pré-preenchido
└──────────────────┘
```

Texto pré-preenchido:
`Olá! Tenho interesse no imóvel "<título>" (cód. <internal_code ?? slug>) — {URL do imóvel}.`

Número alvo: `5511995515053` (mesmo do header). `target="_blank" rel="noreferrer"`. Botão verde discreto, com ícone Lucide `MessageCircle`.

### 2.6 Página vazia / sem resultados

Quando filtros retornarem 0, mostrar card com sugestão: "Nenhum imóvel encontrado com esses filtros." + botão "Limpar filtros".

---

## Fase 3 — Edição de revisão por imóvel

### 3.1 Lista de auditoria já existe → adicionar coluna "ações"

Em `src/routes/_authenticated/audit.tsx`, em cada linha adicionar **link "Editar →"** que leva a `/_authenticated/audit/$id`.

Também ajustar contadores no topo do painel admin (`admin.tsx`) para mostrar os totais corretos: total · completo · revisar · incompleto (já existem).

### 3.2 Tela nova: `src/routes/_authenticated/audit.$id.tsx`

Rota protegida pelo layout `_authenticated`. Layout em 3 colunas em desktop, stack em mobile:

```text
┌────────────────────────────────────────────────────────────────────┐
│ ← Voltar à auditoria                       [ Reprocessar ] [ Salvar ] │
│                                                                    │
│ TÍTULO DO IMÓVEL — cód · slug                                      │
│ ⚠ 3 pendências: sem condomínio · sem metragem · sem dorm.          │
│                                                                    │
│ ┌─ Extraído (parser) ─┐  ┌─ Editável (overrides) ─┐  ┌─ Raw ──────┐│
│ │ Tipo: Apartamento   │  │ Tipo:  [ select ]      │  │ <pre>      ││
│ │ Cidade: Barueri     │  │ Cidade:[ input ]       │  │  source_url││
│ │ Dorm:  3            │  │ Dorm:  [ number ]      │  │  raw.html  ││
│ │ Área U: 96          │  │ Área U:[ number ]      │  │  descrição ││
│ │ Venda: R$ 1.2M      │  │ Venda: [ number ]      │  │ </pre>     ││
│ │ …                   │  │ …                      │  │            ││
│ └─────────────────────┘  └────────────────────────┘  └────────────┘│
│                                                                    │
│ Descrição SEO (preview):                                           │
│ ┌────────────────────────────────────────────────────────────────┐│
│ │  [render do descricao_seo atual]                                ││
│ └────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────┘
```

Campos editáveis (gravam em `manual_overrides` via `saveManualReview`):
- `property_type` (select com os tipos existentes)
- `purpose` (select sale/rent/both)
- `city`, `state`, `neighborhood`, `condominium_name` (text)
- `bedrooms`, `suites`, `bathrooms`, `lavabos` (number)
- `parking`, `parking_covered`, `parking_uncovered` (number)
- `area_useful`, `area_built`, `area_total` (number)
- `price_sale`, `price_rent`, `condo_fee`, `iptu` (number)
- `furnished`, `is_launch`, `accepts_exchange` (checkbox)
- `internal_code` (text)
- Botão "limpar override" por campo (apaga só aquele override e volta ao valor do parser).

### 3.3 Botões "Reprocessar" e "Salvar e regerar SEO"

- **Salvar**: chama `saveManualReview({ id, overrides })`. Mensagem de sucesso, mantém na tela.
- **Reprocessar este imóvel**: chama `reprocessProperties({ id })` (já existe, aceita `id`). Após, opcionalmente chama `regenerateSeo({ id })` para refazer descrição.
- **Salvar e regerar SEO**: combina as duas (salva overrides → reprocessa → regera SEO desse imóvel).

`regenerateSeo` precisa aceitar `id` (verificar; provavelmente já aceita `all`). Se não aceitar, adicionar ramo `id?: string` no inputValidator/handler.

### 3.4 Server fns adicionais

- **`getPropertyForReview(id)`** (nova, em `property-review.functions.ts`): retorna o registro inteiro + `manual_overrides` + `raw` + `audit_issues`. Já temos parcial em `listAuditProperties` mas sem `raw` e `descricao_seo`. Mais simples criar um endpoint dedicado que faz `select *` para esse caso (1 registro, sem custo).
- **Ajuste em `regenerateSeo`** (se necessário) para aceitar `{ id?: string }` no validator.

Nada de migration: tudo já existe na tabela `properties` (campos `manual_overrides`, `audit_status`, `audit_issues`, etc.).

### 3.5 Indicador completo/incompleto/revisar

Já temos `review_status` (`complete` / `incomplete` / `needs_review`) e `audit_status` (`ok` / `review` / `error`). Na lista de auditoria, mostrar **dois badges** lado a lado:
- Completude (review_status): ● verde / ● amarelo / ● vermelho
- Auditoria SEO (audit_status): ✓ / ⚠ / ✗

Legenda discreta acima da lista explicando.

### 3.6 Auditoria com totais — já existe

Cards de totais no topo do `admin.tsx` (`getScrapAudit`) já mostram total/completo/revisar/audit OK/audit revisar/audit erro. Adicionar mais 2 cards:
- "Incompleto" (`incomplete`)
- "% completude" = `complete / total`

---

## Fora do escopo

- Não tocar em `property-parser.ts`, `scraper.functions.ts`, ou no motor SEO.
- Não criar migrações (todos os campos necessários já existem).
- Não alterar `routeTree.gen.ts` (gerado pelo plugin).
- Não tocar em integrations/supabase/*.

## Detalhes técnicos

- Search params com `zodValidator` + `fallback` de `@tanstack/zod-adapter` (não usar `.catch()`).
- Filtros aplicados em memória sobre `Route.useLoaderData()`, com `useMemo`.
- Reuso de `Button` e `Input` shadcn quando útil; `<select>` nativo para os selects (mobile-first).
- WhatsApp: link `https://wa.me/5511995515053?text=...`, com `encodeURIComponent`.
- Tela `audit.$id.tsx` usa `useQuery` para carregar via `getPropertyForReview(id)` e `useMutation` para salvar/reprocessar/regerar.
- Cores: usar tokens semânticos (`brand-yellow`, `brand-dark`, `muted-foreground`); nada de hex em JSX.
