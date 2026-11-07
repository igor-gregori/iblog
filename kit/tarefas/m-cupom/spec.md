# Especificação: cupons de desconto

## Contexto

A loja quer dar desconto por cupom. O cupom é cadastrado antes e o cliente informa o código ao fazer o pedido. Hoje o
pedido tem só `total`, que é a soma dos itens.

## Requisitos

### 1. Cadastro do cupom: `POST /cupons`

Corpo:

| Campo | Tipo | Regra |
| --- | --- | --- |
| `codigo` | texto | de 1 a 30 letras ou dígitos |
| `tipo` | texto | `percentual` ou `fixo` |
| `valor` | inteiro | `percentual`: de 1 a 100 (a porcentagem); `fixo`: 1 ou mais (centavos) |
| `validoAte` | texto | uma data real no formato `AAAA-MM-DD` |
| `minimo` | inteiro | 0 ou mais, em centavos |

- Responde **201** com o cupom no mesmo formato, com o código em maiúsculas.
- O código **não diferencia maiúsculas**: é guardado em maiúsculas, e `natal10` e `NATAL10` são o mesmo cupom.
- Código que já existe, em qualquer caixa: **409**, código `codigo_em_uso`.
- Corpo fora das regras da tabela (inclusive uma porcentagem acima de 100 ou uma data como `2026-13-01`): **400**,
  código `dados_invalidos`.

### 2. Pedido com cupom: `POST /pedidos`

- O corpo aceita `cupom` (texto, opcional), com o código em qualquer caixa.
- Se o cupom não puder ser usado, o pedido inteiro é recusado com **422**, nada é gravado e o estoque não muda. Os
  motivos, cada um com o seu código:
  - `cupom_inexistente`: não há cupom com esse código;
  - `cupom_vencido`: o cupom vale até o fim do dia `validoAte` em UTC, ou seja, enquanto `agora` for antes da
    meia-noite (UTC) do dia seguinte;
  - `pedido_abaixo_do_minimo`: o **subtotal** do pedido (todos os itens, inclusive os em promoção) é menor que
    `minimo`. Igual ao mínimo vale;
  - `cupom_ja_usado`: o mesmo cliente já tem um pedido com esse cupom. Cada cliente usa cada cupom **uma vez**;
  - `cupom_nao_aplicavel`: todos os itens do pedido estão em promoção (veja abaixo).
- Um pedido recusado por qualquer motivo, inclusive falta de estoque, não conta como uso do cupom.

### 3. A conta do desconto

- **Itens em promoção** (produto com `precoPromocional`) **não recebem desconto do cupom**. A base do desconto é a
  soma dos itens sem promoção (preço × quantidade).
- `percentual`: `base × valor / 100`, **arredondado para baixo** ao centavo. 15% de 3.333 centavos é 499.
- `fixo`: o valor do cupom, limitado à base. O total nunca fica negativo e o desconto nunca passa dos itens sem
  promoção.

### 4. O pedido guarda o desconto

O pedido (na resposta do `POST` e em todos os `GET`) passa a ter:

- `subtotal`: a soma dos itens;
- `desconto`: o desconto do cupom, ou 0;
- `total`: `subtotal - desconto`, o que o cliente paga;
- `cupom`: o código usado, em maiúsculas, ou `null`.

Pedidos que já existem ficam com `subtotal = total`, `desconto = 0` e `cupom = null`.

**Critérios de aceitação**

- Cupom de 10% num pedido de R$ 100,00 sem promoção: `subtotal` 10000, `desconto` 1000, `total` 9000.
- Pedido de R$ 60,00 sem promoção mais R$ 40,00 em promoção, com cupom de 10%: `desconto` 600.
- Cupom fixo de R$ 30,00 no pedido de R$ 10,00 sem promoção mais R$ 40,00 em promoção: `desconto` 1000.
- Segundo pedido do mesmo cliente com o mesmo cupom: 422. O de outro cliente: 201.
- Cupom com `validoAte` 2026-03-10: vale às 23:59:59 UTC do dia 10; não vale à 00:00 UTC do dia 11.

## Desenho

- **Migração `002_cupons.sql`**: tabela `cupons` (`codigo` como chave primária, `tipo`, `valor`, `valido_ate`,
  `minimo`, `criado_em`); em `pedidos`, as colunas `subtotal`, `desconto` (padrão 0) e `cupom` (referência a
  `cupons`), com um `UPDATE` que copia `total` para `subtotal` nos pedidos que já existem. Um índice único em
  `(cliente_id, cupom)`, só onde `cupom` não é nulo, garante o uso único mesmo com dois pedidos ao mesmo tempo.
- **Módulo `src/cupons/`**: `repositorio.ts` (inserir e buscar pelo código), `rotas.ts` (`POST /cupons`) e
  `desconto.ts`, com uma função pura `calcularDesconto(cupom, itens)` que recebe os itens com o preço e a marca de
  promoção e devolve o desconto em centavos. Registrar as rotas em `src/app.ts`.
- **`criarPedido`** (`src/pedidos/servico.ts`): recebe o código opcional; dentro da mesma transação que baixa o
  estoque, confere o cupom (existência, validade com `app.agora()`, uso pelo cliente), calcula subtotal, desconto e
  total e grava tudo. Qualquer erro desfaz a transação inteira.
- **Validação da data**: o esquema confere o formato (`pattern`) e o handler confere que a data existe; data que não
  existe responde 400 com `dados_invalidos`.
- `Pedido` e o repositório de pedidos ganham `subtotal`, `desconto` e `cupom`.

## Passos

1. Migração `002_cupons.sql`.
2. Módulo de cupons: repositório, rota de cadastro com as validações e `calcularDesconto`.
3. Desconto em `criarPedido`, com as verificações e os códigos de erro.
4. Campos novos no `Pedido` e no esquema do `POST /pedidos`.
5. Testes em `test/` para cada critério de aceitação: `test/cupons.test.ts` e casos novos em `test/pedidos.test.ts`.
6. `npm test`, `npm run typecheck` e `npm run lint` passando.
