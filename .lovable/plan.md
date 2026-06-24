# Reestruturação visual + carrossel de fotos

Objetivo: aproximar a identidade do projeto do site original **saimoveisalphaville.com.br** (faixa vermelha, faixa amarela, header preto, botões amarelos, logo oficial) e substituir a "parede de fotos" da página do imóvel por uma galeria com carrossel funcional.

## 1. Sistema de cores e tipografia (`src/styles.css`)

Adicionar tokens semânticos da marca, mantendo a base do design system:

```text
--brand-red       (faixa superior)        #B0151C
--brand-yellow    (faixa + CTAs)          #F8C300
--brand-dark      (header/nav/rodapé)     #111111
--brand-ink-soft  (cinza institucional)   #2A2A2A
```

Mapear em `@theme inline` como `--color-brand-red`, `--color-brand-yellow`, `--color-brand-dark` etc., e re-apontar `--primary` para o preto da marca e `--accent` para o amarelo (com `--accent-foreground` preto), de modo que componentes shadcn herdem a paleta sem hardcode.

Tipografia: trocar `Playfair Display` por uma combinação mais próxima do original (institucional/serif clean + sans condensada). Proposta: **"Cormorant Garamond"** (display do logo/títulos) + **"Inter"** (UI) — carregadas via `<link>` no `__root.tsx` (regra Tailwind v4).

## 2. Logo oficial

Baixar a logomarca PNG do site oficial (`SA Imóveis Alphaville` — chave + casinha) e subir como Lovable Asset (`src/assets/logo-sa-imoveis.png.asset.json`). Usar no `SiteHeader` e `SiteFooter` no lugar do "S.A" textual.

Fallback: se o download falhar, gerar uma versão estilizada via `imagegen` mantendo o conceito (silhueta de chave + casinha em preto).

## 3. Header (`src/components/site-header.tsx`)

Recriar a estrutura de três faixas do original:

```text
┌─────────────────────────────────────────────────┐
│  faixa vermelha  ·  tagline corretora           │  ← bg brand-red, texto branco
├─────────────────────────────────────────────────┤
│  faixa amarela   ·  "Aluga * Vende * Permuta…"  │  ← bg brand-yellow, texto preto
├─────────────────────────────────────────────────┤
│  [LOGO]  HOME · IMÓVEIS · GUIAS · BLOG · …      │  ← bg brand-dark, texto branco
└─────────────────────────────────────────────────┘
```

- Faixa 1: telefone/WhatsApp clicáveis à direita.
- Faixa 3: nav em maiúsculas, espaçada, hover amarelo; botão "Pesquisar" vira CTA amarelo (`bg-brand-yellow text-brand-dark`).
- Sticky permanece apenas na barra escura ao rolar.

## 4. Footer (`src/components/site-footer.tsx`)

Fundo `brand-dark` com texto claro, blocos de contato (telefone, WhatsApp, redes sociais), barra inferior em `brand-yellow` curta com copyright. Mantém os mesmos links já existentes.

## 5. Botões amarelos como padrão de CTA

Criar uma variante `brand` em `src/components/ui/button.tsx`:

```text
bg-brand-yellow text-brand-dark hover:bg-brand-yellow/90 font-semibold uppercase tracking-wider
```

Atualizar páginas-chave para usar a variante: `imoveis.index.tsx` ("Ver imóvel"), `index.tsx` (CTAs do hero), `imoveis.$slug.tsx` ("Mais detalhes…", "Voltar ao catálogo" como link discreto).

## 6. Carrossel na página do imóvel (`src/routes/imoveis.$slug.tsx`)

Substituir o grid `md:grid-cols-2` por um **carrossel com thumbnails** usando `@/components/ui/carousel` (embla-carousel-react já instalado).

Layout:

```text
┌──────────────────────────────────────┐
│                                      │
│      [ imagem principal 16:10 ]      │  ← Carousel principal
│   ◀                              ▶   │
│                              1 / 24  │
└──────────────────────────────────────┘
[▢][▢][▢][▢][▢][▢][▢][▢][▢] …          ← faixa de thumbnails clicável (scroll horizontal)
```

Comportamento:
- Setas anteriores/próximas (botões amarelos discretos).
- Contador "x / total" no canto inferior direito.
- Thumbnails sincronizados (clicar leva ao slide; slide ativo destacado com borda amarela).
- Teclas ← / → navegam.
- Loop habilitado.
- Lazy loading (`loading="lazy"`) em imagens fora do primeiro slide.
- Em mobile: carrossel ocupa width total; thumbnails com `overflow-x-auto`.

Componente novo: `src/components/property-gallery.tsx` que recebe `images: string[]` e `title: string`.

## 7. Cards de imóveis (`src/routes/imoveis.index.tsx`)

Ajuste leve para alinhar ao estilo dos cards do original:
- Faixa preta no topo da imagem com preço em amarelo ("VENDA — R$ X").
- Rodapé do card com botão amarelo "VER IMÓVEL" full width.
- Linha de ícones (dormitórios, vagas, banheiros) em faixa escura sob a foto.

Sem mudar dados, só apresentação.

## Fora do escopo

- Não mexer no parser, scraper, motor SEO, função "Rodar agora" nem em migrações — apenas frontend e tokens.
- Não alterar `src/integrations/supabase/*` nem `routeTree.gen.ts`.
- Não reescrever a página inicial inteira — apenas aplicar a nova paleta/CTAs.

## Detalhes técnicos

- Tailwind v4: tokens em `@theme inline`, fontes via `<link>` em `__root.tsx`, nada de `@import` URL em `styles.css`.
- Carrossel: `embla-carousel-react` já presente via `src/components/ui/carousel.tsx` (shadcn). Reusar `Carousel`, `CarouselContent`, `CarouselItem`, `CarouselNext`, `CarouselPrevious` + um segundo embla para os thumbnails sincronizado por callback `onSelect`.
- Logo: tentar `curl` da home oficial → extrair `<img>` do logo → `lovable-assets create`. Se HTTP falhar, gerar via `imagegen` com fundo transparente.
- Acessibilidade: `aria-label` em cada controle do carrossel, `alt` descritivo nas imagens.
