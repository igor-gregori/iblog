Preciso de cancelamento e devolução de pedidos. `POST /pedidos/:id/cancelar` cancela um pedido que ainda não foi
enviado. `POST /pedidos/:id/devolucoes` registra a devolução de itens de um pedido entregue: o corpo traz `itens`, com
`produtoId` e `quantidade`, e a resposta traz a devolução, com o `reembolso` em centavos. Nos dois casos o estoque
volta, e o pedido passa a mostrar quanto já foi reembolsado (`reembolsado`).
