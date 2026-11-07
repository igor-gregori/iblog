import type { FastifyInstance } from 'fastify'
import { NaoEncontrado, ErroDeNegocio } from '../erros.ts'
import { centavos, parametrosComId } from '../esquemas.ts'
import {
  atualizarProduto,
  buscarProduto,
  inserirProduto,
  listarProdutosAtivos,
  type MudancasNoProduto,
  type NovoProduto,
} from './repositorio.ts'

const camposDoProduto = {
  nome: { type: 'string', minLength: 1, maxLength: 200 },
  preco: centavos,
  precoPromocional: { type: ['integer', 'null'], minimum: 0 },
  estoque: { type: 'integer', minimum: 0 },
} as const

export async function rotasDeProdutos(app: FastifyInstance): Promise<void> {
  app.get('/produtos', async () => {
    return { itens: listarProdutosAtivos(app.banco) }
  })

  app.get<{ Params: { id: number } }>('/produtos/:id', { schema: { params: parametrosComId } }, async (pedido) => {
    const produto = buscarProduto(app.banco, pedido.params.id)
    if (!produto) throw new NaoEncontrado('Produto')
    return produto
  })

  app.post<{ Body: NovoProduto }>(
    '/produtos',
    {
      schema: {
        body: {
          type: 'object',
          required: ['nome', 'preco'],
          additionalProperties: false,
          properties: camposDoProduto,
        },
      },
    },
    async (pedido, resposta) => {
      validarPromocao(pedido.body.preco, pedido.body.precoPromocional)
      const produto = inserirProduto(app.banco, pedido.body, app.agora().toISOString())
      return resposta.code(201).send(produto)
    },
  )

  app.patch<{ Params: { id: number }; Body: MudancasNoProduto }>(
    '/produtos/:id',
    {
      schema: {
        params: parametrosComId,
        body: {
          type: 'object',
          additionalProperties: false,
          properties: { ...camposDoProduto, ativo: { type: 'boolean' } },
        },
      },
    },
    async (pedido) => {
      const produto = buscarProduto(app.banco, pedido.params.id)
      if (!produto) throw new NaoEncontrado('Produto')
      const preco = pedido.body.preco ?? produto.preco
      const precoPromocional =
        pedido.body.precoPromocional === undefined ? produto.precoPromocional : pedido.body.precoPromocional
      validarPromocao(preco, precoPromocional)
      atualizarProduto(app.banco, produto.id, pedido.body)
      return buscarProduto(app.banco, produto.id)
    },
  )
}

function validarPromocao(preco: number, precoPromocional: number | null | undefined): void {
  if (precoPromocional != null && precoPromocional >= preco) {
    throw new ErroDeNegocio('promocao_invalida', 'O preço promocional precisa ser menor que o preço normal')
  }
}
