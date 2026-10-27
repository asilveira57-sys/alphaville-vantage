# Visual da home
## Migração da origem para API Tokko
- [ ] Testar API — bloqueado: ORIGEM_API_KEY não está configurado.
- [ ] Gerar simulação e CSV por código de referência, sem gravar imóveis.
- [ ] Adaptar conciliação para API preservando limites, ajustes manuais e SEO; manter rotinas pausadas até liberação.
- [ ] Aplicar mapeamento, fotos e link oficial somente após aprovação da simulação.

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
