import Fastify, { type FastifyError, type FastifyInstance } from 'fastify'
import { abrirBanco, type Banco } from './banco.ts'
import { rotasDeClientes } from './clientes/rotas.ts'
import { ErroDeNegocio } from './erros.ts'
import { rotasDePedidos } from './pedidos/rotas.ts'
import { rotasDeProdutos } from './produtos/rotas.ts'

declare module 'fastify' {
  interface FastifyInstance {
    banco: Banco
    /** A hora atual. Use sempre esta, nunca `new Date()`: os testes trocam o relógio. */
    agora: () => Date
  }
}

export type OpcoesDoApp = {
  banco?: Banco
  agora?: () => Date
  log?: boolean
}

export function criarApp(opcoes: OpcoesDoApp = {}): FastifyInstance {
  const app = Fastify({ logger: opcoes.log ?? false })
  app.decorate('banco', opcoes.banco ?? abrirBanco())
  app.decorate('agora', opcoes.agora ?? (() => new Date()))

  app.setErrorHandler((erro: FastifyError, _pedido, resposta) => {
    if (erro instanceof ErroDeNegocio) {
      return resposta.code(erro.status).send({ erro: { codigo: erro.codigo, mensagem: erro.message } })
    }
    if (erro.validation) {
      return resposta.code(400).send({ erro: { codigo: 'dados_invalidos', mensagem: erro.message } })
    }
    app.log.error(erro)
    return resposta.code(500).send({ erro: { codigo: 'erro_interno', mensagem: 'Erro interno' } })
  })

  app.register(rotasDeProdutos)
  app.register(rotasDeClientes)
  app.register(rotasDePedidos)
  return app
}
