# Loja

API de uma loja pequena, usada como projeto de exemplo. Veja o `CLAUDE.md` para os comandos e as convenções.

## Endpoints

| Método | Caminho | O que faz |
| --- | --- | --- |
| `GET` | `/produtos` | Produtos à venda, em ordem de nome |
| `GET` | `/produtos/:id` | Um produto |
| `POST` | `/produtos` | Cadastra (`nome`, `preco`, `precoPromocional`, `estoque`) |
| `PATCH` | `/produtos/:id` | Muda campos, inclusive `ativo` |
| `POST` | `/clientes` | Cadastra (`nome`, `email`) |
| `GET` | `/clientes/:id` | Um cliente |
| `POST` | `/pedidos` | Cria um pedido pago (`clienteId`, `itens` com `produtoId` e `quantidade`) |
| `GET` | `/pedidos?clienteId=` | Pedidos de um cliente, do mais novo para o mais antigo |
| `GET` | `/pedidos/:id` | Um pedido |
| `POST` | `/pedidos/:id/enviar` | Pago → enviado |
| `POST` | `/pedidos/:id/entregar` | Enviado → entregue |
| `GET` | `/pedidos/:id/historico` | As mudanças de status do pedido |
