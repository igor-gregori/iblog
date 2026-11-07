A listagem de produtos (`GET /produtos`) devolve todos os produtos de uma vez. Quero paginação, com os parâmetros
`pagina` e `porPagina` na query, e filtros por nome (`busca`) e por faixa de preço (`precoMin` e `precoMax`). A
resposta continua com `itens` e passa a trazer também `total`, o número de produtos que atendem aos filtros.
