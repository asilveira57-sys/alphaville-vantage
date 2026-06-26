# Melhorias no Editor do CMS

Vou aplicar 4 melhorias no editor de páginas (`/cms/novo` e `/cms/:id`).

## 1. Editor visual estilo Word (com modo HTML)

Substituir o editor HTML cru atual por um editor rich-text (TipTap), com barra de ferramentas visual:

- Negrito, itálico, sublinhado, riscado
- H1, H2, H3, parágrafo
- Listas (numerada / com marcadores)
- Citação, alinhamento, linha horizontal
- Link (inserir/editar/remover)
- Imagem (com upload — ver item 2)
- Desfazer/refazer
- **Botão "</> HTML"** que alterna entre o modo visual e um `<textarea>` onde o usuário pode colar/editar HTML bruto. Ao voltar para o visual, o HTML é sanitizado e renderizado.

O conteúdo continua salvo como HTML sanitizado no campo `content_html` (mesma estrutura atual, sem migração).

## 2. Upload de imagens (sem precisar de URL)

- Usar o bucket existente `editorial-images` (já criado, privado).
- Tornar o bucket **público** (via `supabase--storage_update_bucket`) para que as imagens publicadas no site sejam visíveis.
- Adicionar políticas RLS em `storage.objects` permitindo upload por usuários autenticados e leitura pública.
- Criar componente `ImageUpload` reutilizável que:
  - Aceita arrastar-e-soltar ou clicar para selecionar
  - Faz upload para `editorial-images/{page-id-ou-tmp}/{uuid}.{ext}`
  - Retorna a URL pública
- Usar em 3 lugares:
  - **Dentro do editor** (botão "Imagem" da toolbar → upload → insere `<img>`)
  - **Imagem principal** (substitui o input de URL por um uploader; mantém URL como fallback)
  - **Galeria** (uploader múltiplo; substitui o textarea de URLs)

## 3. Selects para Bairro e Condomínio relacionados

- Criar server functions `listBairros()` e `listCondominios()` que retornam `{id, name, slug}` das páginas editoriais já cadastradas do tipo `bairro` e dos registros da tabela `condominiums`.
- Substituir os inputs de texto livre por **Combobox com busca** (shadcn `Command` + `Popover`), evitando duplicatas por erro de digitação.
- Salvar o slug do bairro e o UUID do condomínio (como hoje), mas escolhidos da lista.

## 4. Geração automática de SEO com IA

- Adicionar botão **"✨ Gerar SEO com IA"** acima dos campos de SEO no editor.
- Cria server function `generateSeoMetadata` (autenticada) que:
  - Recebe `{ title, content_html, type, neighborhood }`
  - Chama Lovable AI Gateway (`google/gemini-3-flash-preview`) com prompt em PT-BR pedindo: `meta_title` (≤60 chars), `meta_description` (≤160 chars), `keywords` (5–8, separadas por vírgula), focado em SEO local de Alphaville/Tamboré/Barueri/Santana de Parnaíba quando aplicável.
  - Usa `Output.object` com Zod para retorno estruturado.
- Ao clicar, preenche os 3 campos automaticamente (o usuário pode editar depois).
- Requer que título e algum conteúdo já estejam preenchidos; mostra toast se faltar.

## Detalhes técnicos

- **Pacotes novos**: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link`, `@tiptap/extension-underline`.
- **Arquivos a alterar**:
  - `src/components/html-editor.tsx` → substituído por editor TipTap com toggle HTML
  - `src/components/image-upload.tsx` (novo)
  - `src/components/related-select.tsx` (novo — combobox)
  - `src/lib/editorial.functions.ts` → adicionar `listBairros`, `listCondominios`, `generateSeoMetadata`, `uploadEditorialImage`
  - `src/routes/_authenticated/cms.$id.tsx` → integrar tudo
- **Migração**: políticas RLS em `storage.objects` para o bucket `editorial-images`.
- **Sem mudanças** no schema da tabela `editorial_pages` nem nas rotas públicas.

## Fora do escopo desta entrega

- Versionamento de conteúdo / histórico de edições
- Tradução automática
- Otimização de imagens (resize/webp) no upload — pode ser adicionada depois
