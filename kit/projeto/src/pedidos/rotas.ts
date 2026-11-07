import type { FastifyInstance } from 'fastify'
import { NaoEncontrado } from '../erros.ts'
import { id, parametrosComId } from '../esquemas.ts'
import { mudarStatus, type Status } from './estados.ts'
import { buscarPedido, historicoDoPedido, listarPedidosDoCliente } from './repositorio.ts'
import { criarPedido, type NovoPedido } from './servico.ts'

export async function rotasDePedidos(app: FastifyInstance): Promise<void> {
  app.post<{ Body: NovoPedido }>(
    '/pedidos',
    {
      schema: {
        body: {
          type: 'object',
          required: ['clienteId', 'itens'],
          additionalProperties: false,
          properties: {
            clienteId: id,
            itens: {
              type: 'array',
              minItems: 1,
              maxItems: 50,
              items: {
                type: 'object',
                required: ['produtoId', 'quantidade'],
                additionalProperties: false,
                properties: {
                  produtoId: id,
                  quantidade: { type: 'integer', minimum: 1, maximum: 1000 },
                },
              },
            },
          },
        },
      },
    },
    async (pedido, resposta) => {
      const criado = criarPedido(app.banco, pedido.body, app.agora())
      return resposta.code(201).send(criado)
    },
  )

  app.get<{ Querystring: { clienteId: number } }>(
    '/pedidos',
    {
      schema: {
        querystring: { type: 'object', required: ['clienteId'], properties: { clienteId: id } },
      },
    },
    async (pedido) => {
      return { itens: listarPedidosDoCliente(app.banco, pedido.query.clienteId) }
    },
  )

  app.get<{ Params: { id: number } }>('/pedidos/:id', { schema: { params: parametrosComId } }, async (pedido) => {
    return pedidoOu404(app, pedido.params.id)
  })

  app.get<{ Params: { id: number } }>(
    '/pedidos/:id/historico',
    { schema: { params: parametrosComId } },
    async (pedido) => {
      const encontrado = pedidoOu404(app, pedido.params.id)
      return { itens: historicoDoPedido(app.banco, encontrado.id) }
    },
  )

  const transicoes: [string, Status][] = [
    ['enviar', 'enviado'],
    ['entregar', 'entregue'],
  ]
  for (const [acao, para] of transicoes) {
    app.post<{ Params: { id: number } }>(
      `/pedidos/:id/${acao}`,
      { schema: { params: parametrosComId } },
      async (pedido) => {
        const encontrado = pedidoOu404(app, pedido.params.id)
        mudarStatus(app.banco, encontrado, para, app.agora())
        return buscarPedido(app.banco, encontrado.id)
      },
    )
  }
}

function pedidoOu404(app: FastifyInstance, pedidoId: number) {
  const pedido = buscarPedido(app.banco, pedidoId)
  if (!pedido) throw new NaoEncontrado('Pedido')
  return pedido
}
