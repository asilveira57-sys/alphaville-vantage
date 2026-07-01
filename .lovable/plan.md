
# Redesign Visual Premium — S.A Imóveis Alphaville

Objetivo: transformar a aparência de "blog WordPress" em portal imobiliário premium, com identidade azul-marinho profundo + dourado discreto, cards com imagem obrigatória, hover elevado e hierarquia editorial forte.

## 1. Sistema de Design (tokens)

Editar `src/styles.css`:
- Nova paleta escura como acento premium (não substitui o tema editorial claro atual, coexiste):
  - `--navy: oklch(0.20 0.04 250)` — azul-marinho profundo
  - `--navy-deep: oklch(0.14 0.04 255)` — fundo hero escuro
  - `--gold: oklch(0.78 0.13 82)` — dourado discreto
  - `--gold-soft: oklch(0.86 0.09 85)`
  - `--slate-blue: oklch(0.62 0.02 250)` — texto secundário sobre escuro
- Gradientes utilitários: `--gradient-card-overlay`, `--gradient-navy`, `--shadow-premium`, `--shadow-premium-hover`.
- Tokens mapeados via `@theme inline` para gerar utilitários `bg-navy`, `text-gold`, etc.
- Fonte: manter Cormorant Garamond (serif) + Inter, ajustando pesos e tracking.

## 2. Componente base

Criar `src/components/premium-card.tsx` — base reutilizável:
- Props: `image`, `imageAlt`, `eyebrow`, `title`, `description`, `to`/`href`, `params`, `icon`, `cta`, `variant` (dark/light), `aspectRatio`.
- Estrutura: `<Link>` com imagem + overlay gradient escuro + badge superior (eyebrow) + ícone circular dourado opcional no canto superior direito + título grande + descrição + CTA "EXPLORAR →" com seta circular dourada.
- Interações: hover translate-y-1, shadow-premium-hover, zoom sutil da imagem (scale 1.03), transição 250ms, foco acessível com ring dourado.
- Fallback: se `image` ausente → usa `getFallbackImage(category, region)`.

## 3. Variantes especializadas

Todas em `src/components/premium-cards/`:
- `PremiumRegionCard` — usada em `bairros.index.tsx` e homepage Regiões. Ícone temático por região.
- `PremiumPostCard` — usada em `blog.index.tsx` e "Perspectivas Recentes" da home. Sem ícone; badge = tag/categoria; mostra data + tempo de leitura.
- `PremiumPropertyCard` — usada em `imoveis.index.tsx` e "Curadoria S.A" da home. Preço em destaque, badges (Venda/Locação/Alto padrão), quartos/suítes/vagas/m² com ícones lucide.
- `PremiumCondoCard` — usada em `condominios.index.tsx`. Nome + cidade + resumo + "Ver guia".

## 4. Sistema de fallback de imagens

Criar `src/lib/image-fallbacks.ts`:
- Mapa por região (alphaville, tambore, barueri, santana) usando imagens já existentes em `src/assets/`.
- Mapa por tipo (property, condo, post, region).
- Função `getFallbackImage({ type, region, seed })` retorna URL determinística.
- Garantia: nenhum card renderiza sem imagem — o componente PremiumCard já injeta fallback antes de renderizar.

## 5. Blog editorial premium

Reformular `src/routes/blog.index.tsx`:
- Hero editorial: 1 post em destaque grande (aspect 16/9, sobre fundo navy) + 2 secundários ao lado.
- Seção "Guias Regionais" (4 PremiumRegionCards linkando para /guia-*).
- Seção "Mercado Imobiliário" (filtra tags relacionadas).
- Grid de "Posts Recentes" com PremiumPostCard.
- Título de seção editorial forte (serif, uppercase eyebrow dourado).

Reformular `src/routes/blog.$slug.tsx`:
- Capa grande full-width com overlay + título sobreposto, badge de categoria, data e tempo estimado de leitura (calc por word count).
- Largura de leitura confortável (max-w-2xl) com `EditorialContent`.
- Bloco CTA premium no final.
- Seção "Leia também" com 3 PremiumPostCards.

## 6. Páginas de listagem

- `bairros.index.tsx` — substitui grid atual por PremiumRegionCards com fundo navy (a home dark section serve de referência visual).
- `imoveis.index.tsx` — grid de PremiumPropertyCards, filtros mantidos.
- `condominios.index.tsx` — grid de PremiumCondoCards.

## 7. Home

`src/routes/index.tsx`:
- Seção "Perspectivas Recentes" → PremiumPostCard.
- Seção "Curadoria S.A" → PremiumPropertyCard (mantém carrossel horizontal).
- Seção "Territórios de autoridade" (já escura) → PremiumRegionCard com novo tratamento (ícone dourado, CTA seta).

## 8. Botões

Criar variante `premium` no `Button` shadcn (`src/components/ui/button.tsx`):
- `bg-navy text-canvas hover:bg-navy-deep` com borda dourada sutil e sombra premium.
- Variante `gold`: `bg-gold text-navy-deep` para CTAs primários.
- Ícone seta com translate-x no hover.

## 9. Responsividade & performance

- Todos os grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` (regiões) / `lg:grid-cols-4` (posts/imóveis).
- `loading="lazy"`, `width`/`height` explícitos, `object-cover`.
- `min-w-0` e `truncate` onde necessário.

## 10. Escopo fora deste plano

- Não altera CMS/admin (`_authenticated/*`).
- Não altera lógica de dados / server functions.
- Não altera SEO estrutural (H1, meta, JSON-LD permanecem).
- Não instala novas libs de animação — usa transitions Tailwind.

## Arquivos a criar
- `src/components/premium-card.tsx`
- `src/components/premium-cards/region-card.tsx`
- `src/components/premium-cards/post-card.tsx`
- `src/components/premium-cards/property-card.tsx`
- `src/components/premium-cards/condo-card.tsx`
- `src/lib/image-fallbacks.ts`

## Arquivos a editar
- `src/styles.css` (tokens + gradientes)
- `src/components/ui/button.tsx` (variantes premium/gold)
- `src/routes/index.tsx`
- `src/routes/blog.index.tsx`
- `src/routes/blog.$slug.tsx`
- `src/routes/bairros.index.tsx`
- `src/routes/imoveis.index.tsx`
- `src/routes/condominios.index.tsx`

Ao final: teste visual desktop + mobile via preview.
