# Correção das fotos trocadas nos anúncios (terrenos com fotos de apartamento)

## O que está acontecendo (verificado)

A captação (scrap) lê a página do anúncio no site de origem e pega **todas** as fotos que encontra no HTML — inclusive as do bloco "Imóveis semelhantes" que aparece no rodapé da ficha. Resultado: um terreno herda fotos de apartamentos/casas de outros anúncios.

Confirmado na página real de um terreno:
- A galeria verdadeira está dentro do bloco `id="fotos_imovel"`.
- Logo abaixo existe um bloco `class="semelhantes"` com fotos de outros 3–4 imóveis, que hoje também são capturadas.

Tamanho do problema no banco (imóveis ativos: 2.065):
- **929 anúncios** têm pelo menos uma foto que também aparece em outros anúncios (349 casas, 313 apartamentos, 178 terrenos, 66 salas, e outros).
- **390 anúncios estão com a FOTO DE CAPA errada** (133 terrenos, 125 casas, 101 apartamentos, 26 salas, 5 outros) — são anúncios que provavelmente não tinham foto própria e ficaram só com as fotos "emprestadas".
- Em média as fotos contaminadas aparecem no fim da galeria (posição ~14), o que confirma a origem no bloco de semelhantes.

## Correção proposta

### 1. Corrigir a captação (causa raiz)
Passar a extrair fotos **apenas do bloco da galeria do imóvel**:
- Recortar o HTML no início de `id="fotos_imovel"` e cortar antes de `class="semelhantes"` (e de blocos equivalentes) antes de rodar a busca por imagens.
- Manter a ordem original das fotos (capa = primeira da galeria).
- Se a galeria vier vazia, usar a imagem `og:image` da própria ficha como capa única, em vez de cair no HTML inteiro.
- Rede de segurança: descartar qualquer URL que já esteja associada a muitos outros anúncios (indício de foto de vitrine/semelhantes).

### 2. Limpar o que já está cadastrado
- Rodar uma limpeza única que remove, de cada anúncio, as fotos que aparecem em vários anúncios diferentes (as "emprestadas"), preservando as fotos exclusivas e a ordem.
- Anúncios que ficarem sem nenhuma foto são marcados para recaptação e passam a exibir o placeholder padrão em vez de uma foto errada.
- Em seguida, recaptar (scrap) esses anúncios com o extrator corrigido para trazer as fotos corretas.

### 3. Visibilidade no admin
- Adicionar na Auditoria de Imóveis um alerta "Fotos suspeitas / sem foto própria", listando os anúncios afetados, para conferência manual e recaptação individual.

## Detalhes técnicos

- `src/lib/scraper.functions.ts` → `extractImages()`: passa a receber apenas o trecho da galeria; nova função de recorte por marcadores (`fotos_imovel` … `semelhantes`), fallback em `og:image`, filtro de URLs repetidas entre anúncios.
- Migration de limpeza: `UPDATE properties SET images = <fotos exclusivas>` calculado a partir da contagem de ocorrência de cada URL entre anúncios ativos; marca `review_status` para os que ficarem sem foto.
- Auditoria (`/audit`): novo filtro/flag derivado da mesma regra de fotos compartilhadas.
- Nada de conteúdo editorial, textos, filtros ou preços é alterado.
