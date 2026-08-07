# Diagnóstico: textos dos condomínios

## O que a auditoria mostrou

Nada foi apagado ou sobrescrito. Os textos ricos existem no banco, mas estão gravados como **posts de blog**, não como páginas de condomínio.

- As 6 páginas de tipo `condominio` (`residencial-1`, `residencial-10`, `tambore-11`, `genesis`, `alphaville-zero`, `edificios-verticais`) têm 418–592 caracteres e a data de criação é igual à de atualização (25/06). Ou seja: nunca foram editadas desde que nasceram como conteúdo de exemplo.
- Os textos robustos estão em páginas de tipo `blog`, com outros slugs, por exemplo:
  - `residencial-alphaville-10-barueri` — 30.957 caracteres
  - `residencial-alphaville-1-barueri` — 31.183
  - `residencial-genesis-santana-de-parnaiba` — 36.135
  - `residencial-tambore-2-santana-de-parnaiba` — 34.229
  - mais 7 páginas de residenciais (Tamboré 1, 4, 7, 11, Gênesis 2, Burle Marx, Tarumã)
- A rota `/condominios/{slug}` só lê registros com tipo `condominio`. Por isso ela continua exibindo o texto de exemplo, mesmo com o conteúdo bom publicado em `/blog/...`.

Resumo da causa: o conteúdo foi produzido dentro do editor de posts (tipo blog) e as páginas de condomínio nunca foram apontadas para ele. Não houve substituição por atualização do sistema.

## O que será feito

1. **Reconciliação de conteúdo**: mapear cada página de condomínio ao artigo correspondente e promover o artigo para a página de condomínio (título, resumo, conteúdo, imagem, SEO), sem apagar o post de blog.
2. **Redirecionamento**: o slug antigo de blog passa a redirecionar (301) para `/condominios/{slug}`, preservando o SEO já indexado.
3. **Condomínios sem página própria** (Tamboré 1, 2, 4, 7, Gênesis, Gênesis 2, Burle Marx, Tarumã): criar a página de condomínio correspondente com o conteúdo já existente.
4. **Admin**: incluir os condomínios na lista principal do CMS e no Mapa do sistema, com a mesma edição usada no blog (conteúdo, mídia, SEO, CTAs), para que a edição futura ocorra no lugar certo.
5. **Proteção contra recorrência**:
   - nenhuma migração futura pode inserir/atualizar conteúdo de exemplo em páginas existentes — apenas criação de estrutura;
   - painel de auditoria passa a sinalizar páginas com conteúdo abaixo de ~800 caracteres ("possível conteúdo de exemplo") para detectar o problema cedo;
   - registro no log do CMS de toda alteração de conteúdo, já existente, será usado como referência de histórico.

## Detalhes técnicos

- Tabela `editorial_pages`; rota `src/routes/condominios.$slug.tsx` filtra `content_type = 'condominio'`.
- A promoção do conteúdo será feita por atualização de dados (sem DDL), copiando `html_content`, `excerpt`, `featured_image` e campos de SEO do registro blog para o registro condominio; onde não houver registro condominio, criar um novo com o mesmo slug base.
- Redirects via tabela `seo_redirects` já existente; sitemap regenerado após a migração de conteúdo.
- Auditoria: nova checagem em `/admin-auditoria` para páginas curtas por tipo.
