# Diagnóstico + Melhoria do CMS (mídia, SEO, CTAs e Guia de Ruas)

## 1. O que já existe hoje

**Conteúdo e editor**
- `editorial_pages` concentra posts, artigos, guias, bairros, condomínios e páginas institucionais (já tem `meta_title`, `meta_description`, `focus_keyword`, `secondary_keywords`, `canonical_url`, `og_title`, `og_description`, `og_image`, `schema_type`, `faq`, `cards`, `cta_*`, `help_*`).
- Editor TipTap em `html-editor.tsx` com diálogo de imagem (`editor/image-dialog.tsx`), autosave (`editor/use-autosave.ts`) e tags (`editor/tags-input.tsx`). Base64 já está desativado no TipTap.
- CMS em `/cms` e `/admin`; ruas em `/admin-ruas`; empreendimentos em `/admin-empreendimentos`.

**Mídia**
- Bucket privado `editorial-images` + proxy público `/api/public/editorial-image/*` com cache imutável.
- Upload feito em `image-upload.tsx` (arquivo → storage → URL). **Não existe tabela de biblioteca**, nem metadados, nem reuso/pesquisa.

**CTA**
- `post-cta-block.tsx` e `post-help-block.tsx` leem campos `cta_*`/`help_*` de cada página. Não há CTAs reutilizáveis.

**Ruas — hoje existem DOIS módulos**
- `streets` → rotas `/ruas` e `/ruas/:slug` (com CMS admin recente).
- `street_guides` → rotas `/guia-de-ruas-alphaville` e `/guia-de-ruas-alphaville/:slug`.
- Ambos estão no sitemap. Não há link no menu principal para nenhum dos dois.

**Sitemap**
- `/sitemap.xml` server-side, lista estática + imóveis ativos + `editorial_pages` publicadas. Já filtra rascunhos; ainda não filtra `noindex` nem inclui todas as ruas/parceiros/empreendimentos.

## 2. O que será feito (incremental, sem apagar nada)

### Fase A — Biblioteca de mídia
- Nova tabela `media_library`: `storage_path`, `url`, `original_filename`, `title`, `alt_text`, `caption`, `description`, `width`, `height`, `mime_type`, `size_bytes`, `folder`, `is_decorative`, `uploaded_by`, timestamps. Nenhuma tabela existente é alterada.
- Tabela `media_usage` (media_id, content_type, content_id) para "onde está sendo usada" e bloquear exclusão de imagem em uso.
- Server functions `media.functions.ts`: listar (busca por nome, filtro por pasta e data, paginado), registrar upload, atualizar metadados, substituir arquivo, excluir se não usada.
- Nova rota admin `/admin-midia`: grade, upload múltiplo, busca, filtros por pasta (Blog, Ruas, Condomínios, Guias, Empreendimentos, Parceiros, Institucional, Geral), copiar URL, editar alt/título/legenda, ver usos.
- Componente `MediaPicker` (modal) reutilizável: "enviar nova" ou "escolher da biblioteca". Sem duplicação física do arquivo.

### Fase B — Editor
- Botão **Adicionar mídia** no `HtmlEditor` abrindo o `MediaPicker`; inserção na posição do cursor com alt, legenda, alinhamento, largura e link (reaproveita o `ImageDialog` atual).
- Handler de colagem: imagem colada/base64 → upload ao Storage → registro na biblioteca → substituição pela URL permanente, com pedido de alt.
- Aviso (não bloqueante) ao publicar com imagem sem alt; opção "imagem decorativa" → `alt=""`.

### Fase C — SEO avançado por página
- Painel único `SeoPanel` (componente compartilhado) usado no CMS de posts/páginas e no CMS de ruas: title, description, keywords, slug, canonical, imagem social, OG title/description, robots (index/noindex × follow/nofollow), schema, datas.
- Contadores visuais 60/160 caracteres, sem cortar texto.
- Fallbacks automáticos já aplicados na renderização (title → título; description → resumo; imagem social → OG image → destaque → padrão; canonical → URL da própria página).
- Migração adiciona apenas colunas faltantes: `robots_index`, `robots_follow`, `social_image`, `meta_keywords` onde não existirem (em `editorial_pages` e `streets`).
- Pré-visualização Google / Facebook / WhatsApp usando os valores efetivos.

### Fase D — Gestão central de CTAs
- Tabela `cta_blocks` (nome interno, título, descrição, botões 1 e 2, imagem/ícone, tipo, variação visual, contexto de conversão, tipos de conteúdo permitidos, ordem, ativo).
- Tabela `cta_defaults` (CTA padrão por tipo de conteúdo).
- Rota admin `/admin-ctas` (CRUD + pré-visualização).
- `PostCtaBlock` **mantém o layout atual**, apenas passa a aceitar dados vindos do CTA selecionado. Hierarquia: CTA da página → padrão do tipo → CTA geral → nenhum (se ocultado).
- Campos existentes `cta_*` continuam valendo como CTA da página, então nada muda no que já está publicado.

### Fase E — Guia de Ruas
- Preservar `/ruas` e `/guia-de-ruas-alphaville` (sem quebrar URLs) e criar `/guia-de-ruas` como hub principal, com 301 canônico apontando para a rota indexada correta.
- Hub: introdução, pesquisa, filtros por cidade/bairro/região, listagem alfabética, ruas em destaque, relacionados, breadcrumbs, paginação e CTA final.
- Página individual de rua: seletor de CTA (padrão do guia, específico, oculto), bloco de CTA antes dos relacionados, condomínios próximos, imóveis, artigos relacionados e data de atualização.
- Navegação: entrada "Guia de Ruas" dentro de **Guias** no menu, no rodapé, no mapa do site e nas páginas de bairros/condomínios.

### Fase F — Sitemap, performance e migração
- Sitemap passa a incluir ruas publicadas, guias de ruas, parceiros e empreendimentos, e a excluir qualquer página marcada como `noindex`.
- Upload gera versão WebP otimizada preservando o original; `width`/`height` sempre no HTML; `loading="lazy"`; limite de tamanho configurável com aviso.
- Rotina idempotente (executável no admin de mídia) para varrer HTML existente, migrar imagens base64/coladas para o Storage, registrá-las na biblioteca e trocar o `src` mantendo posição e dimensões.

### Fase G — Segurança e auditoria
- Todas as tabelas novas com RLS: leitura pública apenas do necessário; escrita restrita a `admin`/`editor` via `has_role`.
- Validação de extensão, MIME e tamanho no upload; bloqueio de executáveis e SVG não sanitizado.
- Tabela `cms_audit_log` registrando upload, troca/exclusão de imagem, alteração de SEO, alteração de CTA e publicação, com usuário e data.

## 3. Garantias
Nenhum conteúdo, slug, URL, imagem, campo de SEO ou CTA atual é apagado ou reescrito. Todas as colunas novas são opcionais e as tabelas novas são aditivas.

## 4. Observação técnica
Como o escopo é grande, a execução será feita nas fases acima, em ordem (A→G), cada uma verificável de forma independente.
