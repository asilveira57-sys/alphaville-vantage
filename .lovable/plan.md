# Padronizar novos empreendimentos no modelo Andrômeda

## Objetivo
Fazer com que todo empreendimento criado em **/admin-empreendimentos** gere uma página pública completa, com a mesma estrutura premium das páginas individuais da MPD, em vez da página editorial simples atual.

## O que será feito
- Criar um modelo público reutilizável para empreendimentos cadastrados pelo painel.
- Exibir apresentação, imagem de capa, visão geral, ficha técnica, conteúdo editorial, galeria, plantas/tour, unidades disponíveis, perguntas frequentes e contato.
- Usar automaticamente a incorporadora vinculada no título, navegação e formulário.
- Manter SEO, imagem social e conteúdo preenchidos no CMS.
- Preservar integralmente as quatro páginas MPD atuais e todos os dados já cadastrados.
- Melhorar a criação no painel com campos estruturados necessários para preencher o novo modelo desde o início.

## Comportamento esperado
1. O administrador cria o empreendimento e o vincula à incorporadora.
2. Preenche dados, conteúdo, fotos, plantas e perguntas.
3. Ao publicar, a página em **/empreendimentos/nome-do-empreendimento** assume automaticamente o padrão visual completo do Andrômeda.
4. O empreendimento aparece na página pública da incorporadora vinculada.

## Detalhes técnicos
- A rota dinâmica de empreendimentos passará a usar um componente próprio, sem reutilizar a página editorial genérica.
- Os campos existentes do CMS serão reaproveitados; informações estruturadas adicionais serão armazenadas sem alterar conteúdos atuais.
- Galeria, plantas e unidades continuarão usando os vínculos já existentes pelo identificador do empreendimento.
- O formulário seguirá a proteção anti-robô e registrará a origem como página de empreendimento.
- A implementação será validada em desktop e celular, além da verificação automática do portal.
