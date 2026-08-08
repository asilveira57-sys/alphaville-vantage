# Imóveis filtrados na página do condomínio (com controle no Admin)

## Objetivo
Na página de cada condomínio (ex.: Residencial Tamboré 2) exibir um bloco com os imóveis daquele condomínio — venda e locação — e um CTA que leva à busca já filtrada. A seleção não é feita por IA: quem define é o Admin.

## Como vai funcionar para o usuário do site
Abaixo do conteúdo editorial, antes de "Veja também", entra a seção **"Imóveis no {nome do condomínio}"**:
- Abas: Todos / À venda / Para alugar (com contagem em cada aba).
- Grade de cards no mesmo padrão premium já usado em imóveis (CleanPropertyCard), até 9 itens.
- Botão "Ver todos os imóveis deste condomínio" → `/imoveis` com o filtro de condomínio já aplicado.
- Se não houver imóvel vinculado, a seção simplesmente não aparece (sem lista genérica).

## Como vai funcionar no Admin
No editor da página do condomínio (Admin → Conteúdo → editar a página, tipo "condominio") entra uma nova aba **"Imóveis"**:
- **Condomínio vinculado**: seleção do cadastro de condomínio que alimenta a lista (reaproveita o campo já existente "Condomínio relacionado", agora exibido também nesta aba).
- **Prévia dos imóveis encontrados**: lista os imóveis vinculados a esse condomínio, com foto, código, finalidade e preço.
- **Incluir imóveis manualmente**: busca por título/código e adiciona imóveis que não estão vinculados ao cadastro.
- **Excluir imóveis**: marcar itens da prévia que não devem aparecer na página.
- **Exibir/ocultar a seção** e **título personalizado** do bloco.
- Ordem final: manuais primeiro (na ordem escolhida), depois os automáticos.

Tudo é salvo junto com a página; nenhum conteúdo existente é apagado ou reescrito.

## Detalhes técnicos
1. **Banco** — migração aditiva em `editorial_pages`:
   - `properties_block_enabled boolean not null default true`
   - `properties_block_title text`
   - `properties_included_ids uuid[] not null default '{}'`
   - `properties_excluded_ids uuid[] not null default '{}'`
   Nenhuma coluna existente é alterada. O vínculo principal continua sendo `related_condominium → condominiums.id` e `properties.condominium_id`.
2. **Server functions** (`src/lib/editorial.functions.ts` ou novo `condo-properties.functions.ts`):
   - `listCondoProperties({ condominiumId, includedIds, excludedIds })` — leitura pública via cliente publishable, `status = 'active'`, projeção enxuta (slug, título, imagens, purpose, área, dorms, vagas, preços), ordenada por preço/atualização, sem limite de 1000 (usa `fetch-all`).
   - `searchPropertiesForPicker({ q })` — busca por título/código para o seletor manual do Admin.
   - Ambas com validação Zod e retorno de DTOs simples.
3. **Página** `src/routes/condominios.$slug.tsx`: loader faz `ensureQueryData` da nova query (só quando `related_condominium` existir) e o componente usa `useSuspenseQuery`; novo componente `src/components/condominios/condo-properties-block.tsx` com as abas e a grade.
4. **CTA/link**: `/imoveis?condo=<nome do condomínio>&purpose=…`, usando o filtro `condo` que a listagem já suporta.
5. **Admin**: nova aba "Imóveis" em `src/routes/_authenticated/cms.$id.tsx`, com componente próprio para prévia/seleção; salva os novos campos no mesmo submit e invalida as queries da página do condomínio.
6. **SEO**: os cards já são links reais para `/imoveis/$slug`, reforçando o link interno; nenhuma mudança nas metas atuais.

## Fora do escopo
Sem alterações em layout global, busca de imóveis, blog ou scraper.
