## Objetivo

Unificar os "Posts" do painel admin com o CMS Editorial. Hoje o admin gera/lista posts em `blog_posts` com um editor simples; o CMS Editorial usa `editorial_pages` com TipTap, upload de imagem, selects relacionados e SEO por IA. Vamos mover o blog inteiro para o CMS Editorial (tipo `blog`) e remover a duplicidade.

## O que muda

### 1. Geração de artigo com IA passa a criar `editorial_pages`
- `generatePostWithAI` em `src/lib/blog.functions.ts` é reescrita (ou substituída por `generateEditorialDraftWithAI` em `editorial.functions.ts`) para inserir em `editorial_pages` com:
  - `content_type: "blog"`
  - `status: "draft"`
  - `html_content`: markdown convertido para HTML (parágrafos, H2/H3, listas) — ou pedimos diretamente HTML ao modelo.
  - `meta_title`, `meta_description`, `focus_keyword` preenchidos pela mesma chamada.
- O botão "Gerar rascunho" no admin continua existindo, mas após gerar redireciona direto para `/cms/$id` (edição no novo editor).

### 2. Painel admin
- A seção **Posts** do `admin.tsx` passa a listar `editorial_pages` com `content_type='blog'` (reusa `listEditorialPages`).
- Cada linha vira link para `/cms/$id` (editar com TipTap, upload, etc.). Remove o botão "Publicar" inline — publicação acontece dentro do CMS (já existe lá).
- Mantém o formulário "Gerar artigo com IA" no admin, agora apontando para o novo fluxo.

### 3. Rotas públicas do blog
- `src/routes/blog.tsx` (listagem) e `src/routes/blog.$slug.tsx` (detalhe) passam a ler de `editorial_pages` via `listPublishedByType({type:'blog'})` e `getEditorialBySlug` (que já existem).
- Conteúdo renderizado via `<EditorialContent html={...}>` (já existe) em vez de markdown.

### 4. Migração de dados
- Migration SQL que copia linhas de `blog_posts` para `editorial_pages`:
  - `content_type='blog'`, `status` (draft/published/archived), `slug`, `title`, `excerpt`, `featured_image=cover_image_url`, `meta_title`, `meta_description`, `tags`, `published_at`, `author_id`.
  - Converte `content_markdown` → HTML simples no SQL (usa `regexp_replace` para `## `, `### `, parágrafos) **ou** marca um campo temporário e fazemos a conversão num script — proposta: conversão simples no SQL é suficiente; usuário já pode reabrir e refinar no TipTap.
- Após a migração: `DROP TABLE blog_posts CASCADE` (junto com `content_generation_jobs.blog_post_id` FK — recriar como `editorial_page_id`, ou simplesmente dropar a coluna).

### 5. Limpeza
- `src/lib/blog.functions.ts` reduzido (ou removido) — funções públicas `listPublishedPosts` e `getPostBySlug` deixam de ser usadas e podem ser apagadas.
- `listAllPostsAdmin` e `upsertPost` (do blog) removidos.

## Arquivos afetados
- `src/lib/blog.functions.ts` — remover/limpar.
- `src/lib/editorial.functions.ts` — adicionar `generateEditorialDraftWithAI({topic, category, content_type:'blog'})`.
- `src/routes/_authenticated/admin.tsx` — listagem e botão IA usando editorial_pages; link direto para `/cms/$id`.
- `src/routes/blog.tsx`, `src/routes/blog.$slug.tsx` — passar a usar editorial_pages.
- Migration SQL: copia `blog_posts → editorial_pages` e dropa `blog_posts` (+ ajusta `content_generation_jobs`).

## Fora do escopo
- Versionamento de conteúdo, agendamento, multi-autor.
- Redesign das páginas públicas do blog.

## Confirmações antes de implementar
1. Posso **dropar a tabela `blog_posts`** após copiar os dados para `editorial_pages`? (recomendado para evitar duplicidade)
2. A conversão markdown→HTML simples na migration é aceitável? (Você pode reabrir cada post no novo editor e ajustar se quiser.)
