import type { FastifyInstance } from 'fastify'
import { Conflito, NaoEncontrado } from '../erros.ts'
import { parametrosComId } from '../esquemas.ts'
import { buscarCliente, buscarClientePorEmail, inserirCliente } from './repositorio.ts'

export async function rotasDeClientes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { nome: string; email: string } }>(
    '/clientes',
    {
      schema: {
        body: {
          type: 'object',
          required: ['nome', 'email'],
          additionalProperties: false,
          properties: {
            nome: { type: 'string', minLength: 1, maxLength: 200 },
            email: { type: 'string', pattern: '^[^@\\s]+@[^@\\s]+$' },
          },
        },
      },
    },
    async (pedido, resposta) => {
      const email = pedido.body.email.trim().toLowerCase()
      if (buscarClientePorEmail(app.banco, email)) {
        throw new Conflito('email_em_uso', 'Já existe um cliente com esse e-mail')
      }
      const cliente = inserirCliente(app.banco, pedido.body.nome, email, app.agora().toISOString())
      return resposta.code(201).send(cliente)
    },
  )

  app.get<{ Params: { id: number } }>('/clientes/:id', { schema: { params: parametrosComId } }, async (pedido) => {
    const cliente = buscarCliente(app.banco, pedido.params.id)
    if (!cliente) throw new NaoEncontrado('Cliente')
    return cliente
  })
}
