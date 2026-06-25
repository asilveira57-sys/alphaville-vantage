
# CMS Editorial — SA Imóveis Alphaville

Módulo único e escalável para gerenciar todo conteúdo editorial do site (condomínios, bairros, cidade, guias, blog, institucional) com SEO completo por página.

## 1. Banco de dados

Nova tabela `public.editorial_pages` (unificada para todos os tipos):

```
id, title, slug (unique), content_type (enum: condominio|bairro|cidade|guia|blog|institucional),
excerpt, html_content, featured_image, gallery_images (text[]),
status (draft|published|archived), is_featured, display_order,
tags (text[]), related_neighborhood, related_condominium (uuid → condominiums.id, nullable),
meta_title, meta_description, focus_keyword, secondary_keywords (text[]),
canonical_url, og_title, og_description, og_image,
schema_type (Article|BlogPosting|Place|Residence|LocalBusiness),
author_id, created_at, updated_at, published_at
```

RLS:
- `anon` + `authenticated`: SELECT onde `status = 'published'`
- `admin` (via `has_role`): full CRUD + leitura de rascunhos

Índices: slug, (content_type, status, published_at), GIN em tags.

Mantemos `condominiums` e `blog_posts` existentes (não removemos para não quebrar `/imoveis` link ao condomínio). A `editorial_pages` é a fonte de conteúdo das **páginas editoriais**. O link de imóvel→condomínio continua via `condominiums.id`, mas a página pública `/condominios/[slug]` passa a ler de `editorial_pages` (com `content_type='condominio'` e mesmo slug).

## 2. Rotas públicas (TanStack)

- `/condominios` — listagem dinâmica (cards = editorial_pages tipo condominio, published)
- `/condominios/$slug` — página individual
- `/bairros` — listagem
- `/bairros/$slug` — página individual
- `/blog` — listagem (continua usando blog_posts existente, mas adapta link dos cards editoriais novos)
- `/blog/$slug` — individual (já existe — `blog.$slug.tsx`)
- Páginas existentes `/alphaville`, `/guia-*` ganham seção "Veja também" puxando de editorial_pages
- 404 amigável quando slug não existe ou não publicado

Renomeação: rota atual `condominio.$slug.tsx` (singular) → criar `condominios.$slug.tsx` (plural, conforme spec) e redirecionar singular para plural.

Cards atuais em `/condominios` viram `<Link>` reais para `/condominios/$slug` (Residencial 1, 10, Tamboré 11, Gênesis, Alphaville Zero, Edifícios Verticais).

SEO por página: `head()` lê loader data e injeta meta title/description/canonical/OG + JSON-LD do `schema_type`.

## 3. Admin (`/_authenticated/cms`)

- **Listagem** `/cms`: tabela com busca (título), filtros (tipo, status, tag), badges de status, indicador de SEO (5 checks), ações: editar, visualizar, publicar/despublicar, duplicar, excluir.
- **Editor** `/cms/$id`:
  - Campos: título, slug auto-editável, tipo, resumo, imagem principal (upload bucket `editorial-images`), galeria, status, destaque, ordem, tags, condomínio/bairro relacionado.
  - Editor rico: **TipTap** (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`) com toolbar (H1/H2/H3, bold, italic, listas, link, imagem, code).
  - Sanitização: **DOMPurify** no render do front (allowlist de tags/attrs; bloqueia script, on*, iframe).
  - Aba SEO: meta title/description, focus keyword, secondary keywords (chips), canonical, OG title/desc/image, schema_type.
  - Indicador SEO ao vivo: meta title preenchido, meta description preenchida, slug, H1 presente no HTML, ≥600 palavras, ≥1 link interno (`href` começando com `/`).
- **Novo** `/cms/novo`: mesmo editor, modo criação.

## 4. Seeds iniciais

Inserir via migração 6 páginas com `content_type='condominio'`, status='published', conteúdo placeholder editorial básico + meta SEO:
- residencial-1, residencial-10, tambore-11, genesis, alphaville-zero, edificios-verticais

## 5. Sitemap

`sitemap[.]xml.ts` passa a incluir todas as `editorial_pages` publicadas.

## 6. Dependências a instalar

`@tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image isomorphic-dompurify`

## 7. Server functions (em `src/lib/editorial.functions.ts`)

- `listEditorialPages({ contentType?, status?, search?, tag? })` — admin (auth)
- `getEditorialPageBySlug(slug)` — público (anon, RLS filtra)
- `listPublishedByType(type, { featured?, limit? })` — público
- `upsertEditorialPage(input)` — admin
- `deleteEditorialPage(id)` — admin
- `duplicateEditorialPage(id)` — admin
- `togglePublish(id)` — admin

## 8. Header/Nav

Adicionar link "Bairros" no menu (Condomínios e Blog já existem). Item "CMS" no menu admin.

## Notas técnicas

- HTML do editor é sanitizado **no render** (defesa em profundidade), não na escrita.
- Slug auto-gerado a partir do título (lowercase, sem acento, hífens). Editável e único.
- Upload de imagens reutiliza bucket `editorial-images` (já existe) via signed URL.
- Schema.org gerado dinamicamente no `head()` da rota pública conforme `schema_type`.
- Identidade visual atual preservada: reuso de tokens, `site-header`, `Card`, etc.

---

Após aprovação: rodo a migração (você revisa antes), instalo as deps, crio as rotas, o admin e os seeds em sequência.
