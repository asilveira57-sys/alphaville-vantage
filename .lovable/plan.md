# Triagem imóvel a imóvel dentro de um grupo grande

O grupo "Condomínio Lançamento Metragem" tem 556 imóveis que pertencem a condomínios diferentes. Vincular o grupo inteiro levaria todos para o lugar errado. A solução é transformar o painel do grupo numa bancada de triagem, onde cada imóvel é classificado individualmente (ou em lotes pequenos que você mesmo monta), com sugestão automática de destino.

## O que muda na tela do grupo

### 1. Aviso e bloqueio inteligente
Quando um nome solto tem muitos imóveis, o botão "Vincular" (em lote total) passa a pedir confirmação explícita, avisando que os imóveis podem ser de condomínios diferentes e sugerindo usar a triagem.

### 2. Seletor de condomínio em cada linha
Cada imóvel da lista ganha seu próprio seletor "Condomínio: …" ao lado. Escolher no seletor já grava na hora — sem precisar marcar caixa nem apertar outro botão. Ao gravar, a linha sai da lista com um "Desfazer" rápido.

### 3. Sugestão automática por linha
O sistema lê o título e o endereço do imóvel (ex.: "ALAMEDA AMÉRICA - Tamboré", "Jardins de Tamboré") e sugere o condomínio oficial mais provável, mostrando um botão de um clique: "Vincular a Jardins de Tamboré". Se nenhum condomínio oficial corresponder, aparece "Criar condomínio 'X' e vincular".

### 4. Agrupar automaticamente dentro do grupo
Um botão "Agrupar por sugestão" reorganiza os 556 imóveis em sub-blocos por condomínio sugerido (ex.: 40 do Jardins de Tamboré, 22 do Burle Marx, 310 sem sugestão). Cada sub-bloco tem "Vincular todos deste bloco", então grandes fatias corretas são resolvidas de uma vez, sem misturar.

### 5. Busca, filtro e paginação dentro do grupo
Campo de busca por título/endereço/código, filtro "só sem sugestão" e paginação de 30 em 30, para dar conta dos 556 sem travar a tela.

### 6. Arrastar para o condomínio
Uma coluna lateral fixa lista os condomínios oficiais. É possível arrastar uma linha (ou a seleção marcada) e soltar sobre um condomínio para vincular. Serve como atalho — o seletor por linha continua sendo o caminho principal e acessível.

### 7. Endereço visível
Cada linha passa a mostrar endereço/bairro além do título e código, que é a informação que permite decidir o condomínio correto sem abrir o imóvel. O botão "Ver" continua abrindo a página do imóvel em nova aba.

## Detalhes técnicos

- `listGroupProperties`: incluir `address`, `neighborhood`, `city`, `region` no select e aceitar `search`, `page`, `pageSize`; retornar total para a paginação.
- Nova função de sugestão (server, em `src/lib/condominiums-admin.functions.ts`): normaliza título/endereço/bairro com `normalizeName` e casa contra nomes de `condominiums` + `condominium_aliases`, devolvendo `{ propertyId, suggestedCondoId, suggestedLabel, score }` em lote para a página atual.
- Reuso de `assignPropertiesToCondominium` para gravação individual (array de 1) e para blocos; adicionar mutação de desfazer que reenvia o `condominium_id` anterior.
- Novo componente `src/components/admin/condo-triage.tsx` com a lista paginada, seletor por linha, sub-blocos por sugestão e alvos de drop; `admin-condominios.tsx` passa a renderizá-lo no lugar da lista atual de `GroupProperties`.
- Drag-and-drop com HTML5 nativo (draggable + onDrop), sem nova dependência.
- Confirmação obrigatória no "Vincular" em lote quando o grupo tiver mais de 25 imóveis.
- Todas as ações continuam registradas em `cms_audit_log`; nenhum imóvel é excluído.
