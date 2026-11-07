# Especificação: cancelamento e devolução de pedidos

## Contexto

Hoje um pedido nasce `pago`, vai para `enviado` e depois para `entregue`, sempre por `mudarStatus`
(`src/pedidos/estados.ts`), que registra cada mudança no histórico. Não há como cancelar um pedido nem devolver
itens. O pagamento e o estorno no meio de pagamento acontecem fora deste sistema: aqui só se registra quanto foi
reembolsado.

## Requisitos

### 1. Status novos

```text
pago ──► enviado ──► entregue ──► devolvido
  │
  └────► cancelado
```

- `cancelado`: só a partir de `pago`.
- `devolvido`: quando **todos** os itens de um pedido entregue foram devolvidos, somando todas as devoluções.
- As duas mudanças passam por `mudarStatus` e entram no histórico (`GET /pedidos/:id/historico`), como as que já
  existem.

### 2. Cancelar: `POST /pedidos/:id/cancelar`

- Só um pedido `pago` pode ser cancelado. Qualquer outro status (enviado, entregue, já cancelado, devolvido):
  **409**, código `transicao_invalida`, sem mudar nada.
- O cancelamento devolve ao estoque todos os itens, **mesmo de produtos desativados**, e marca todo o total como
  reembolsado.
- O pedido guarda quando foi cancelado em `canceladoEm`, como já guarda `enviadoEm` e `entregueEm`.
- Responde **200** com o pedido atualizado. Pedido que não existe: **404**.

### 3. Devolver: `POST /pedidos/:id/devolucoes`

Corpo: `{ "itens": [{ "produtoId": 1, "quantidade": 2 }] }`, com pelo menos um item e quantidades a partir de 1.
Corpo malformado (lista vazia, quantidade 0): **400**, `dados_invalidos`.

Regras, todas com **422** quando falham, sem gravar nada:

- O pedido precisa estar `entregue`. Pedido `pago` ou `enviado`: 422, código `pedido_nao_entregue`. Pedido
  `cancelado` ou `devolvido`: **409**, `transicao_invalida`.
- **Prazo**: a devolução vale até 7 dias (168 horas) depois de `entregueEm`, inclusive o instante exato do limite.
  Depois: `prazo_de_devolucao_encerrado`.
- Cada produto aparece uma vez só na devolução: `item_repetido`.
- Só produtos do pedido: `item_fora_do_pedido`.
- **Devoluções parciais se somam**: para cada produto, o total devolvido em todas as devoluções não passa da
  quantidade comprada: `quantidade_maior_que_a_comprada`.

Quando a devolução é aceita:

- o estoque de cada produto devolvido volta (mesmo de produto desativado);
- o reembolso é a soma de `precoUnitario × quantidade` de cada item, com o **preço pago na compra**, guardado no
  pedido, não o preço atual do produto;
- se, somando todas as devoluções, todos os itens foram devolvidos, o pedido passa para `devolvido`.

Responde **201** com a devolução:

```json
{
  "id": 1,
  "itens": [{ "produtoId": 1, "quantidade": 2 }],
  "reembolso": 10000,
  "criadaEm": "2026-03-01T12:00:00.000Z"
}
```

Os itens saem na ordem em que vieram no pedido de devolução.

### 4. Pedido repetido não duplica: `Idempotency-Key`

- O `POST /pedidos/:id/devolucoes` aceita o cabeçalho opcional `Idempotency-Key` (texto livre, até 100 caracteres).
- Se já existe uma devolução **desse pedido** com essa chave e com os mesmos itens, a resposta é **200** com a mesma
  devolução de antes, e nada é gravado de novo (nem estoque, nem reembolso).
- Mesma chave com itens diferentes: **409**, código `chave_reutilizada`.
- Sem o cabeçalho, cada chamada é uma devolução nova.

### 5. O pedido mostra o que foi reembolsado

`GET /pedidos/:id` (e todas as respostas com o pedido) passam a trazer:

- `reembolsado`: o total reembolsado, em centavos (0 quando não houve nada; o total, quando cancelado);
- `canceladoEm`: a data do cancelamento, ou `null`;
- `devolucoes`: a lista das devoluções do pedido, em ordem de criação, no mesmo formato da resposta do `POST`.

## Desenho

- **Migração `002_devolucoes.sql`**:
  - em `pedidos`, as colunas `cancelado_em` e `reembolsado` (inteiro, padrão 0);
  - tabela `devolucoes` (`id`, `pedido_id`, `reembolso`, `chave` com o `Idempotency-Key`, que pode ser nula,
    `criada_em`), com um índice único em `(pedido_id, chave)`;
  - tabela `itens_devolucao` (`devolucao_id`, `produto_id`, `quantidade`).
- **`src/pedidos/estados.ts`**: `cancelado` e `devolvido` no tipo `Status` e nas transições (`pago → cancelado`,
  `entregue → devolvido`), e `cancelado_em` em `COLUNA_DA_DATA`.
- **Estoque**: `devolverEstoque(banco, produtoId, quantidade)` em `src/produtos/repositorio.ts`, que soma sem olhar
  se o produto está ativo.
- **Regra em `src/pedidos/devolucoes.ts`**: `cancelarPedido` e `registrarDevolucao`, cada uma inteira dentro de
  `emTransacao`, junto com `mudarStatus`. A hora vem sempre de `app.agora()`.
- **Repositório de pedidos**: ler `reembolsado`, `canceladoEm` e as devoluções com os itens.
- **Rotas** em `src/pedidos/rotas.ts`. A comparação de corpo para a `Idempotency-Key` é sobre a lista de itens
  (produto e quantidade, na ordem enviada).

## Passos

1. Migração `002_devolucoes.sql`.
2. Status e transições novos em `estados.ts`.
3. `devolverEstoque` no repositório de produtos.
4. `cancelarPedido` e a rota de cancelamento.
5. `registrarDevolucao`, com as regras, o prazo, a soma das devoluções e a mudança para `devolvido`.
6. `Idempotency-Key`.
7. Campos novos no pedido (`reembolsado`, `canceladoEm`, `devolucoes`).
8. Testes em `test/` para cada regra: `test/devolucoes.test.ts` e casos novos em `test/pedidos.test.ts`.
9. `npm test`, `npm run typecheck` e `npm run lint` passando.
