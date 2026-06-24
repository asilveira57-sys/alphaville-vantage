## Problema

O imóvel da imagem tem **50 m² útil** e **50 m² construída** claramente no site da corretora (tabelinha lateral e descrição), mas o parser não captura porque ele só entende um formato de metragem.

Hoje o parser só aceita o padrão "rótulo antes do número":
- `área útil 96 m²` ✓
- `área construída 400 m²` ✓
- `AU 96 m²` / `AC 400 m²` / `AT 500 m²` ✓

E não reconhece os formatos que o site da corretora usa de verdade:
- `50,00 m² útil` (número **antes** do rótulo)
- `50,00 m² construída` (idem)
- `50 m2` solto na descrição (sem rótulo nenhum)

Por isso a auditoria marca "Sem metragem" e a descrição SEO sai sem m².

## Solução

Estender só o `src/lib/property-parser.ts`, sem mexer no scraper nem em banco. Aceitar as três variantes acima e usar "metragem solta" como fallback quando nenhum rótulo for encontrado.

### O que muda em `parsePropertyText`

1. **Padrão invertido com rótulo após o número** — para cada uma das três áreas:
   - `area_useful`: também aceitar `<num> m² útil`, `<num> m² útil/privativ`, `<num> m² privativa`
   - `area_built`: também aceitar `<num> m² constru[ií]da`
   - `area_total`: também aceitar `<num> m² (de )?terreno`, `<num> m² total`

2. **Metragem solta como fallback** — se ainda assim nada foi capturado, varrer todas as ocorrências de `<num> m²` / `<num> m2` no texto e adotar a **maior** como `area_useful` (ignorando números absurdos como < 10 ou > 10.000 para descartar ruído tipo "1 m de altura" ou áreas de condomínio inteiras). Só usa esse fallback se nenhum rótulo foi encontrado, para não atropelar dados rotulados.

3. **Sincronizar útil ↔ construída quando iguais** — quando o site só publica uma das duas mas as duas costumam ser iguais em apartamentos, **não** copiar automaticamente; manter regra estrita (só preenche o que foi visto no texto). Isso evita inventar dado.

### O que NÃO muda

- Scraper, banco, motor SEO, botão "Rodar agora": nada.
- `humanizeOriginalDescription`, `computeReviewStatus`: nada.
- Migration: nenhuma.

## Como o usuário verifica

1. Clica em **Rodar agora** no `/admin` — o botão já dispara scraper + regenerar SEO em todos os imóveis com as regras novas.
2. Abre o mesmo imóvel: o card "Sobre este imóvel" deve agora mostrar a metragem no parágrafo de abertura e na lista de dados, e o status de auditoria deixa de acusar "Sem metragem" nesses casos.

## Detalhe técnico

Arquivo único: `src/lib/property-parser.ts` — adicionar 3 novas regex no bloco "Áreas" e um helper `pickFallbackArea(text)` chamado só quando `area_useful`, `area_built` e `area_total` ficaram todos nulos.