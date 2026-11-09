# Visual da home
## Ajustes do documento (09/11, 19h22)
- [ ] Corrigir Brascan/Gramercy Park, conferir Stadium, completar usos e relatar incompatíveis.
- [ ] Cadastrar os apelidos pedidos sem mudar vínculos e aplicar somente os movimentos pendentes com ajuste manual, SEO e 301.
- [ ] Confirmar itens já feitos e informar imóveis restantes em AlphaGran, Alpha Sítio e Villa Solaia.
## Polo Empresarial e relatório numerado (09/11)
- [x] TE00882 confirma Polo Empresarial; cadastro renomeado com apelido, AR00033 movido de Tamboré 3 com ajuste manual; dois títulos/SEO/endereços refeitos com 301 conferidos e dois avisos IndexNow aceitos.
- [x] CSV de 105 vínculos numerados (101 etiquetas vazias, quatro diferentes), 950 conferidos na API atual após retirar AR00033 corrigido; nenhum vínculo do relatório alterado.
## Cadastro aprovado de condomínios (09/11)
- [x] Conferir proposta e apelidos: 102 cadastros novos, oito reutilizados, Villa Velha renomeado; usos corrigidos.
- [x] Vincular 291 ativos sem condomínio; preservar todos os vínculos/ajustes anteriores; título/SEO e 263 endereços novos com 301, mais três de Villa Velha; IndexNow aceitou 560 URLs.
- [x] Entregar quatro CSVs: criados, 114 apelidos, vínculos antes/depois e 107 restantes (todos sem etiqueta); AP06244 conferido na ficha, oito testes passaram.
## Central e uso de condomínios (07/11)
- [x] Relatar nomes duplicados/quase iguais; fundir somente Gramercy Madison, Penthouse e Paisagem, preservando imóveis, apelidos e textos, com 301.
- [x] Corrigir PR00049, PR00002 e SA00605 com ajustes manuais, título/slug/SEO e 301; páginas e redirecionamentos conferidos.
- [x] Liberar terreno para qualquer uso; preservar TE00775 e testar.
## Campanhas de e-mail (06/11)
- [x] Contatos e CSV com prévia, lotes de 250, deduplicação e consentimento; newsletter sem evidência fica inativa.
- [x] Editor por blocos, seleção de imóveis, prévias e modelo Reconfirmação; imagens em Storage privado com endereço público restrito a imagens de campanhas (bucket público bloqueado pelo espaço).
- [x] Fila até 100, limite inicial 1.000/dia, trava por execução, desligado por padrão; agendamento a cada minuto apenas quando iniciado, desliga ao drenar.
- [x] Descadastro assinado sem login testado em contato fictício e lido no Admin; métricas, limites de rejeição/reclamação e UTM existentes do Radar/captação preservados.
- [x] CSV de 20 demonstrado no Admin: 16 válidos, 2 arriscados inativos, 2 inválidos excluídos. Nenhum envio à lista real; 11 testes passaram e telas desktop/celular verificadas.
- [ ] Enviar teste aceito pelo Resend — bloqueado: Resend retornou 403, domínio news.saimoveisalpha.com.br não verificado na conta da chave cadastrada.
- [ ] Validar eventos e envio real ponta a ponta — bloqueado: publicar o endereço dos eventos, configurar eventos no Resend e cadastrar RESEND_WEBHOOK_SECRET; campanhas permanecem desligadas.
## Fotos exclusivas de admin (04/11)
- [x] Barra acima da galeria, download direto por código e aviso de fotos faltantes.
- [x] Download em cada linha da lista de fotos do Admin; visitante sem controles/HTML sem botões e download real admin conferidos (7 fotos), 3 testes de ZIP.
## Compartilhamento (01/11)
- [x] Opções de compartilhamento perto do preço e nos cards; cópia e compartilhamento nativo conferidos.
- [x] Compartilhar seleção com filtros atuais e contagem total.
- [x] Tags da prévia conferidas no HTML, mensagens/UTM testadas (15 testes).
- [ ] Confirmar foto na prévia real do WhatsApp após publicar — redimensionador retornou HTTP 403 na verificação externa; tags apontam capa real com 1200x630.
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

## Segurança da sincronização e códigos (04/11)
- [x] Timeout/novas tentativas por página, execuções travadas marcadas e alertadas.
- [x] Trava 95% + limite 50 com aprovação no admin + alertas por e-mail.
- [x] Código segue a Univen, códigos antigos viram apelido de busca; 8 aplicados.
- [x] Alertas de código fora do padrão/repetido no painel.
- [ ] Publicar para valer na execução de hora em hora.

## Condomínios pela etiqueta da Univen (05/11)
- [x] Gravar 198 dos 199 do grupo 1 (CA04365 inativo), com título/slug/SEO e 301.
- [x] Tabela de apelidos Univen + uso na sincronização; "Não se Aplica" desativado.
- [x] Uso residencial/comercial/misto; Link, Acqua Park, Europa, Alpha Green, Trix separados.
- [x] Tela "Etiquetas da Univen", relatórios e CSV de apelidos.
- [ ] Publicar para a sincronização de hora em hora usar as regras novas.
