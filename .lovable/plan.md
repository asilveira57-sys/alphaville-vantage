## Diagnóstico dos problemas atuais

1. **"Não respeita h1/h2/h3, vira um bloco horroroso"** — o `EditorialContent` usa classes `prose prose-headings:...` do plugin `@tailwindcss/typography`, mas esse plugin **não está instalado** neste projeto (só existe `@tailwindcss/vite`). Resultado: nenhum estilo é aplicado, tudo cai no default do browser sem hierarquia. Isso afeta o blog, o preview do CMS e qualquer página que usa `EditorialContent`.
2. **"Perde o texto enquanto digito, volta para o original"** — no `HtmlEditor` o `useEffect` sincroniza `value → editor` sempre que `value !== editor.getHTML()`. Como o TipTap normaliza HTML (aspas, espaços, tags vazias), o HTML devolvido nunca bate exatamente com o que o pai guardou, disparando `setContent` no meio da digitação e revertendo o cursor/conteúdo.
3. **Faltam recursos** — inserir imagem com **alt**, link interno com autocomplete de rotas, **tabelas**, atalhos de teclado, e **auto-save**.

## O que vou construir

### 1. Corrigir a renderização do conteúdo (blog, guia, bairro, condomínio, preview)
- Instalar `@tailwindcss/typography` e ativá-lo no `src/styles.css` via `@plugin "@tailwindcss/typography"` (padrão Tailwind v4).
- Refinar `EditorialContent`: escala tipográfica premium (h1 serif grande, h2/h3 com pesos e espaçamento coerentes ao design atual), listas, blockquote, tabelas com bordas, imagens com legenda, links com sublinhado dourado.
- Adicionar CSS específico para `<table>`, `<figure>`/`<figcaption>` e `<img alt>` para ficar consistente entre editor e página publicada (WYSIWYG real).

### 2. Reescrever o `HtmlEditor` para nível WordPress
Base continua TipTap, mas com extensões novas e barra reorganizada:
- **Headings** H1/H2/H3/H4 + Parágrafo (dropdown).
- **Formatação**: negrito, itálico, sublinhado, riscado, código inline, sobrescrito/subscrito, limpar formatação.
- **Blocos**: listas, checklist, citação, separador, bloco de código.
- **Links internos**: modal com busca por título nas páginas publicadas (`editorial_pages`, `properties`, `condominios`, `bairros`) via novo server function `searchInternalLinks`; também aceita URL externa; edita/remove link existente.
- **Imagem com alt**: modal com upload (usa `uploadEditorialImageFile` já existente) + campo obrigatório de **texto alternativo** + legenda opcional. Insere como `<figure><img alt=""><figcaption></figcaption></figure>`. Permite reeditar alt clicando na imagem.
- **Tabelas**: extensões `@tiptap/extension-table`, `table-row`, `table-header`, `table-cell`. Menu contextual: inserir/remover linha, coluna, cabeçalho, mesclar/dividir células.
- **Alinhamento** (esquerda/centro/direita) para parágrafos e imagens.
- **Atalhos** padrão (Ctrl+B, Ctrl+I, Ctrl+K para link, Ctrl+Z/Y).
- **Modo HTML** mantido para colar código bruto.
- **Correção do bug de "voltar ao original"**: a sincronização externa passa a ocorrer apenas quando o `id` da página muda (troca de documento) — não em cada keystroke. Um `ref` guarda o `id` atual; enquanto for o mesmo, o editor é a fonte da verdade.

### 3. Auto-save (WordPress-style)
- Debounce de 2s após parar de digitar → salva rascunho via `upsertEditorialPage` já existente.
- Indicador de estado no topo: "Salvando…", "Salvo às 14:32", "Erro — tentar novamente".
- Salva também ao trocar de aba/fechar (`beforeunload` + `visibilitychange`).
- Bloqueia auto-save enquanto `status = "published"` a menos que o usuário confirme (para não publicar mudanças sem revisão) — em rascunho salva livremente.
- Botão manual "Salvar" continua disponível.

### 4. Prevenção contra perda de conteúdo
- Snapshot local em `sessionStorage` a cada mudança (chave por `id`), restaurado se a página recarregar antes do auto-save concluir.

## Escopo técnico

**Pacotes novos** (via `bun add`):
- `@tailwindcss/typography`
- `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-header`, `@tiptap/extension-table-cell`
- `@tiptap/extension-text-align`
- `@tiptap/extension-task-list`, `@tiptap/extension-task-item`
- `@tiptap/extension-subscript`, `@tiptap/extension-superscript`
- `@tiptap/extension-placeholder`

**Arquivos alterados/criados**
- `src/styles.css` — registrar plugin typography + estilos custom para tabela/figure.
- `src/components/editorial-content.tsx` — nova escala tipográfica.
- `src/components/html-editor.tsx` — reescrito.
- `src/components/editor/` (novo) — `link-dialog.tsx`, `image-dialog.tsx`, `table-menu.tsx`, `toolbar.tsx`, `use-autosave.ts`.
- `src/lib/editorial.functions.ts` — adicionar `searchInternalLinks` (busca em `editorial_pages` published + `properties` ativas + rotas fixas do site).
- `src/routes/_authenticated/cms.$id.tsx` — integrar auto-save + indicador de estado + snapshot em sessionStorage.

**Sem mudanças** em backend/RLS/tabelas — tudo já existe.

## Fora de escopo (posso fazer depois se quiser)
- Histórico de revisões (versionamento).
- Colaboração multi-usuário em tempo real.
- Blocos reutilizáveis / Gutenberg-style block library.

Confirmando: sigo com este plano?