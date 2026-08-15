# Central de Condomínios no Admin

Hoje os 2.065 imóveis importados do scrap têm apenas um texto livre de condomínio (218 valores diferentes) e nenhum está vinculado a um condomínio real — o cadastro oficial de condomínios está vazio e existem só 13 páginas editoriais de condomínio. Por isso a barra de filtro mostra frases como "Condomínio Lançamento Metragem" (556 imóveis), "condomínio com lazer completo" ou duplicidades como "tambore 11" e "Tamboré 11 Alphaville".

## O que será construído

### 1. Cadastro oficial de condomínios
Cada condomínio real passa a ser um registro único (nome oficial, região/bairro, slug). É a única fonte de verdade — o filtro do site e as páginas passam a usar esse cadastro, não o texto do scrap.

### 2. Nova página Admin → Condomínios
Lista uma linha por condomínio com:
- nome oficial, bairro/região, quantidade de imóveis vinculados
- selo de status: **tem guia** / **sem guia** (com botão "Criar guia")
- expandir a linha mostra os imóveis daquele condomínio (foto, título, código, finalidade, preço)

Ações na lista:
- **Unificar (merge)**: escolher dois ou mais grupos e concatenar num condomínio único; todos os imóveis são reapontados e o nome antigo vira apelido/canônico (redirecionamento 301 do slug antigo para o novo, quando já existir página publicada).
- **Renomear** para o nome oficial correto.

### 3. Aba "Não classificados / frases soltas"
Todos os textos do scrap que ainda não viraram condomínio real aparecem aqui, ordenados por quantidade de imóveis. Para cada grupo você pode:
- **Vincular** ao condomínio oficial existente (em lote, todos os imóveis do grupo de uma vez)
- **Criar condomínio** a partir daquele nome
- **Marcar como "não é condomínio"** — o texto é limpo dos imóveis e some do filtro do site

### 4. Edição individual do imóvel
Dentro do grupo, cada imóvel tem um seletor de condomínio para corrigir caso a caso, além da seleção múltipla para mover vários de uma vez.

### 5. Cobertura de guias
Um painel no topo mostra: total de condomínios, quantos já têm página de guia e quantos faltam. O botão "Criar guia" abre o CMS já com o condomínio vinculado, título e slug pré-preenchidos, para você completar o texto — assim todos os condomínios acabam com guia.

### 6. Filtro do site limpo
A barra "Condomínio" nas páginas de imóveis passa a listar apenas condomínios oficiais cadastrados (com contagem), acabando com as frases soltas.

## Detalhes técnicos

- Popular `public.condominiums` a partir dos nomes de imóveis (apenas os aprovados no admin); usar `properties.condominium_id` como vínculo real e manter `condominium_name` só como texto original do scrap.
- Nova tabela `condominium_aliases` (alias, normalizado, condominium_id, `is_not_condominium` boolean) para guardar cada variação do scrap, permitir merge e reclassificação automática de novos scraps.
- Migração adiciona a tabela + grants + RLS (leitura pública dos condomínios ativos; escrita só para admin/editor via `has_role`).
- Server functions em `src/lib/condominiums-admin.functions.ts`: listar grupos com contagem, listar não classificados, criar/renomear condomínio, merge (update em lote de `condominium_id` + registro de alias + `seo_redirects` 301), atribuir imóveis individuais, marcar alias como não-condomínio, criar rascunho de guia em `editorial_pages`.
- Nova rota `src/routes/_authenticated/admin-condominios.tsx` com as duas abas, expansão por linha, seleção em lote e busca; link adicionado em `/admin-mapa` e `/admin`.
- Ajuste do filtro em `src/components/property-filters.tsx` / fonte de opções para usar condomínios oficiais.
- Nenhum imóvel é excluído; todas as ações são reversíveis e registradas em `cms_audit_log`.
