# Corrigir captura de aluguel "R$ X/m²" + auditoria de desproporção venda/aluguel

## Diagnóstico

Caso: `Valor aluguel R$ 15,00/m²` + `Valor aluguel total R$ 135.000,00` na descrição. O parser hoje (em `src/lib/property-parser.ts:215`) usa:

```regex
/(?:valor\s+)?(?:aluguel|loca[cç][aã]o)[^R$]{0,30}R\$\s*([\d.,]+)/i
```

e casa primeiro com **"Valor aluguel R$ 15,00"** (ignora o sufixo `/m²` e não tenta "aluguel total"). Resultado: `price_rent = 15`.

Consulta confirma que hoje só **1 imóvel** está nesse estado (`price_rent=15`, `price_sale=11.200.000`). Mesmo assim, vale travar a regra no parser + no audit pra não voltar a acontecer.

## 1. `src/lib/property-parser.ts` — capturar `price_rent` corretamente

Substituir a única regex de aluguel por uma cascata que prefere o valor total e descarta o "por m²":

1. **Aluguel total explícito**: `valor\s+(?:aluguel|loca[cç][aã]o)\s+total[^R$]{0,30}R\$\s*([\d.,]+)` → vence tudo.
2. **Aluguel "por m²"**: detectar `(?:aluguel|loca[cç][aã]o)[^R$]{0,30}R\$\s*([\d.,]+)\s*\/\s*m[²2]` separadamente, guardar como `rent_per_m2` interno e, se houver `area_total` (ou `area_built`/`area_useful` com sentido comercial), calcular `price_rent = rent_per_m2 * area`.
3. **Aluguel "puro"** (regex atual): só usa o valor se a captura **não** for imediatamente seguida de `/m²` (negative lookahead `(?!\s*\/?\s*m[²2])`).
4. Sanidade pós-captura: se `price_rent < 100` (R$ 100 mensal), descarta — nenhum imóvel em Alphaville aluga por menos disso. Fica como pendência pro audit.

A função devolve também `rent_per_m2` no `parsed` para alimentar o audit (passa por `manual_overrides`/audit_issues, sem migration; campo só serve em memória durante reprocesso).

## 2. `src/lib/property-seo.ts` — `auditProperty` ganha 2 regras

Adicionar à lista de `audit_issues` (sem mudar enum `audit_status`):

- **`price_rent_suspect`**: quando `price_rent` existe e é < R$ 100 — provavelmente foi capturado um "/m²" sem total. Status passa a `review`.
- **`rent_sale_ratio_off`**: quando ambos existem e a razão `price_rent / price_sale` cai fora de `[0.0015, 0.02]` (ou seja, ~0,15% a 2% ao mês — janela larga para tolerar imóveis comerciais e residenciais). Status `review`.

Esses códigos viram dois novos filtros opcionais no `listAuditProperties` (`filter: "rent_suspect" | "ratio_off"`) e aparecem como pendência na lista existente sem mexer no schema.

## 3. Reaplicar nos imóveis já cadastrados

Sem migration. O admin já tem o botão **"Reprocessar todos"** (`reprocessProperties({ all: true })`) que roda o parser + audit em cada imóvel preservando overrides. Após o deploy desta correção, basta clicar — o caso do terreno Cajamar vai pegar o valor 135.000 e os futuros casos vão entrar como `review` antes de "vazarem" para o catálogo.

Documentar no admin: nota curta abaixo do botão "Reprocessar todos" lembrando que ele aplica as **regras atualizadas** do parser/audit.

## 4. Scraper

`src/lib/scraper.functions.ts` apenas coleta `html_excerpt`/`body_excerpt` e delega ao parser. Nada muda lá: a correção do parser já resolve para imóveis novos.

## Fora do escopo

- Sem alteração de schema/migration.
- Não mexer no motor SEO além das 2 regras de audit acima.
- Não mexer em filtros do `/imoveis` (Fase 2 já entregue).
- Não tentar inferir "preço por m²" para imóveis de venda (só para aluguel, que é o vetor do bug).

## Detalhes técnicos

- Cascata implementada com 3 chamadas de `pickMoney`, escolhendo a primeira não nula nessa ordem: total → por_m²_calculado → puro_com_negative_lookahead.
- O cálculo `rent_per_m2 * area` usa `area_total` quando disponível; senão `area_built`; senão `area_useful`. Resultado é arredondado para inteiro (R$).
- Audit ratio usa `Math.min(price_sale, price_rent*12*100)` para evitar divisão por zero e clamp simples.
- Sem alterações no contrato dos server fns existentes (`reprocessProperties`, `getScrapAudit`, `listAuditProperties`); só `filter` ganha 2 valores novos no validator.
