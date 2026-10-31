# Visual da home
## Ajustes nas listagens
- [x] Corrigir busca local com 400 ms, Enter e abertura por código.
- [x] Unificar preços por finalidade e código nos cards/PDF.
- [x] Aplicar menor preço no servidor em todas as listagens.
- [x] Testar Bellagio/AP06837 em desktop e celular.
## Migração da origem para API Tokko
- [x] Testar API — HTTP 200, 2.384 imóveis, chave configurada.
- [x] Gerar simulação e CSV por código de referência, sem gravar imóveis.
- [x] Gravar mapeamento, importar novos, miniaturas, SEO, link oficial e religar verificação diária pela API.
- [ ] Publicar para a verificação diária pela API valer no site publicado.

## Simulador de financiamento
- [x] Criar página independente reutilizando o simulador sem mudar a ficha.
- [x] Adicionar conteúdo, taxas atualizadas, busca por faixa e contato com origem correta.
- [x] Incluir no sitemap, mapa do site e rodapé; testar o fluxo público e confirmar contato salvo (leitura no CRM autenticado indisponível nesta sessão).

- [x] Separar Pesquisa Inteligente do destaque editorial e ampliar sua largura.
- [x] Destacar Radar com chamada de ativação, contraste e botão chamativo.
- [x] Conferir apresentação e abertura do Radar.
# Velocidade de /imoveis
- [x] Pesquisa no servidor (15 por página + total) com a mesma lógica.
- [x] Contagens dos filtros em consulta separada com cache de 5 min.
- [x] Teste de paridade (16 combinações).
- [x] URL limpa, sem redirecionamento, canonical absoluto.
- [x] Fotos leves (600/1200 px WebP) para os imóveis existentes.
- [ ] Gerar fotos leves automaticamente na captura — bloqueado: o servidor do site não processa imagens.
- [x] Ficha só com as colunas usadas.
- [ ] Medir PageSpeed depois — depende de publicar.
# Filtros da busca /imoveis (31/10)
- [x] Valor de/até digitáveis com máscara R$, aplica no blur/Enter, URL ?min=&max= (compat com priceMin/priceMax).
- [x] Condomínio com seleção múltipla (dropdown + busca + checkbox; mobile tela cheia com Aplicar), match por condominium_id, contagens respeitando outros filtros, URL ?condo=slug1,slug2, compat com nome antigo, noindex com 2+ condomínios.
- [x] Números como palavra inteira + equivalências 1/I/Um via aliases da Central.
- [x] Testes: Residencial 1+2 juntos; "residencial 1" sem 10/11/12; Venda R$1–2 mi.
