# Especificação: paginação e filtros na listagem de produtos

## Contexto

`GET /produtos` devolve todos os produtos ativos de uma vez, em `{ "itens": [...] }`. Com o catálogo crescendo, a
listagem precisa de paginação e de filtros por nome e por preço.

## Requisitos

### 1. Paginação

- A query aceita `pagina` (inteiro, a partir de 1; padrão 1) e `porPagina` (inteiro de 1 a 100; padrão 20).
- Valor fora desses limites, ou que não seja um inteiro, é recusado com **400** e o código `dados_invalidos`.
- Uma página depois da última não é erro: devolve **200** com `itens` vazio e o `total` certo.

**Critérios de aceitação**

- Com 25 produtos, `?pagina=2&porPagina=10` devolve do 11º ao 20º, na ordem da listagem.
- Sem parâmetros, devolve os 20 primeiros.
- `?porPagina=101`, `?porPagina=0`, `?pagina=0` e `?pagina=abc` dão 400.

### 2. Formato da resposta

```json
{ "itens": [...], "total": 25, "pagina": 2, "porPagina": 10 }
```

- `total` é o número de produtos que passam nos filtros, contando todas as páginas.
- `pagina` e `porPagina` são os valores usados, inclusive quando vieram do padrão.
- Cada item é o produto no mesmo formato de hoje.

### 3. Busca por nome

- `busca` filtra os produtos cujo nome **contém** o texto.
- A comparação **não diferencia maiúsculas de minúsculas nem acentos**: `cafe` acha "Café com Leite" e "CAFETEIRA";
  `CHÁ` e `cha` acham "Chá".
- `%` e `_` no texto são caracteres comuns, não curingas: `50%` acha "Cupom 50% off", mas não "Kit 500 peças".
- Os espaços nas pontas são ignorados. Uma busca vazia, ou só com espaços, não filtra nada.

### 4. Faixa de preço

- `precoMin` e `precoMax` são inteiros em centavos, maiores ou iguais a zero. Os dois são opcionais e os dois limites
  **entram** na faixa.
- A faixa vale sobre o **preço de venda**: o preço promocional, quando o produto tem um; o preço normal, quando não.
- `precoMin` maior que `precoMax` é recusado com **400** e o código `dados_invalidos`.

### 5. O que não muda

- Só os produtos ativos aparecem, com ou sem filtros.
- A ordem continua a de hoje: por nome e, em caso de empate, por id.
- Os filtros se combinam (todos precisam valer), e a paginação vem depois dos filtros.

## Desenho

- **Esquema da rota.** `querystring` em `src/produtos/rotas.ts` com `pagina`, `porPagina`, `precoMin` e `precoMax`
  como inteiros com os limites acima e `busca` como texto. A verificação de `precoMin > precoMax` fica no handler e
  responde no mesmo formato de erro de validação (400, `dados_invalidos`).
- **Busca sem acentos no SQLite.** O SQLite não ignora acentos. Registrar em `abrirBanco` (`src/banco.ts`) uma função
  SQL determinística `normalizar(texto)`, que tira os acentos (`normalize('NFD')` e remoção das marcas combinantes) e
  põe em minúsculas. O filtro fica `normalizar(nome) LIKE ? ESCAPE '\'`, com o termo passado pela mesma
  normalização em TypeScript e com `\`, `%` e `_` escapados antes de ganhar os `%` das pontas.
- **Repositório.** Trocar `listarProdutosAtivos` por `listarProdutos(banco, filtros)`, que devolve
  `{ itens, total }`: uma consulta com `COUNT(*)` e outra com `LIMIT` e `OFFSET`, com o mesmo `WHERE`. O preço de venda
  no SQL é `COALESCE(preco_promocional, preco)`.
- Nenhuma migração: não há coluna nova.

## Passos

1. Função `normalizar` em TypeScript e registro dela como função SQL em `abrirBanco`.
2. `listarProdutos` no repositório, com filtros, contagem e paginação.
3. Esquema da query e handler da rota, com a verificação da faixa de preço.
4. Testes em `test/produtos.test.ts` para cada critério de aceitação acima.
5. `npm test`, `npm run typecheck` e `npm run lint` passando.
