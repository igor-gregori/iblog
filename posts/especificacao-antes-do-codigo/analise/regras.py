"""Os testes escondidos do grupo "regras", cada um com o tipo de decisão que ele cobra.

A classificação é um julgamento, feito uma vez, lendo o pedido de cada tarefa:

- `silencio`: o pedido não diz nada sobre o assunto (o prazo de devolução, o uso único do cupom, a promoção).
- `escolha`: o pedido deixa o assunto em aberto e há mais de uma resposta razoável (o fuso da validade, a busca
  com ou sem acento).
- `contrato`: o formato da resposta e os códigos HTTP (os campos que a resposta traz, 400 ou 422).
"""

TIPOS = {
    "silencio": "O pedido não fala do assunto",
    "escolha": "O pedido deixa em aberto",
    "contrato": "Formato da resposta e códigos HTTP",
}

CLASSIFICACAO: dict[str, dict[str, str]] = {
    "p-paginacao": {
        "porPagina vale 20 quando não vem, e a resposta diz a página e o tamanho": "contrato",
        "busca não diferencia maiúsculas nem acentos": "escolha",
        "busca trata % e _ como texto, não como curinga": "escolha",
        "busca vazia ou só com espaços não filtra, e os espaços das pontas são ignorados": "escolha",
        "a faixa de preço usa o preço de venda (o promocional, quando há)": "escolha",
        "os limites da faixa de preço entram": "escolha",
        "página depois da última devolve a lista vazia, com o total": "contrato",
        "parâmetros fora dos limites são recusados com 400": "contrato",
    },
    "m-cupom": {
        "o código não diferencia maiúsculas: é guardado e devolvido em maiúsculas": "contrato",
        "código repetido, em qualquer caixa, é recusado com 409": "contrato",
        "o cupom vale até o fim do dia de validoAte, em UTC": "escolha",
        "cada cliente usa o mesmo cupom uma vez só": "silencio",
        "um pedido recusado não gasta o uso do cupom": "silencio",
        "itens em promoção não recebem o desconto do cupom": "silencio",
        "o desconto fixo não passa do valor dos itens sem promoção": "silencio",
        "se todos os itens estão em promoção, o cupom é recusado e nada muda": "silencio",
        "o mínimo vale sobre o subtotal de todos os itens, e o próprio mínimo basta": "silencio",
        "o desconto percentual é arredondado para baixo, ao centavo": "escolha",
        "cadastro recusa porcentagem fora de 1 a 100, valor zero e data inválida": "contrato",
        "pedido sem cupom responde cupom null": "contrato",
    },
    "g-devolucao": {
        "cancelar responde 409 para pedido já cancelado ou entregue": "contrato",
        "o cancelamento entra no histórico e guarda a data em canceladoEm": "contrato",
        "o estoque volta mesmo se o produto foi desativado": "escolha",
        "devoluções parciais se somam e não passam do que foi comprado": "escolha",
        "o pedido lista as devoluções": "contrato",
        "devolução depois de 7 dias da entrega é recusada": "silencio",
        "com tudo devolvido, o pedido passa para devolvido, com evento no histórico": "silencio",
        "a mesma Idempotency-Key devolve a mesma devolução, sem repetir nada": "silencio",
        "a mesma Idempotency-Key com outro corpo é recusada com 409": "silencio",
        "devolução sem itens, com quantidade zero ou com item repetido é recusada": "contrato",
    },
}
