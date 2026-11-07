Quero cupons de desconto nos pedidos. Um endpoint `POST /cupons` cadastra o cupom com `codigo`, `tipo` (`percentual`
ou `fixo`), `valor` (a porcentagem, ou o valor em centavos), `validoAte` (uma data, `AAAA-MM-DD`) e `minimo` (o valor
mínimo do pedido, em centavos). O `POST /pedidos` passa a aceitar um campo opcional `cupom`, com o código. O pedido
guarda o desconto: a resposta traz `subtotal`, `desconto` e `total` (o que o cliente paga).
