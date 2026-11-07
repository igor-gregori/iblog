import type { FastifyInstance, InjectOptions } from 'fastify'
import { criarApp } from '../src/app.ts'

/** Um relógio que os testes controlam. Começa em 1º de março de 2026, ao meio-dia (UTC). */
export class Relogio {
  atual = new Date('2026-03-01T12:00:00Z')

  agora = (): Date => new Date(this.atual)

  avancarDias(dias: number): void {
    this.atual = new Date(this.atual.getTime() + dias * 24 * 60 * 60 * 1000)
  }
}

export type Contexto = {
  app: FastifyInstance
  relogio: Relogio
  pedir: (opcoes: InjectOptions) => Promise<{ status: number; corpo: any }>
}

export function montar(): Contexto {
  const relogio = new Relogio()
  const app = criarApp({ agora: relogio.agora })
  const pedir = async (opcoes: InjectOptions) => {
    const resposta = await app.inject(opcoes)
    return { status: resposta.statusCode, corpo: resposta.body ? resposta.json() : undefined }
  }
  return { app, relogio, pedir }
}

export async function criarProduto(ctx: Contexto, dados: Record<string, unknown> = {}) {
  const { status, corpo } = await ctx.pedir({
    method: 'POST',
    url: '/produtos',
    payload: { nome: 'Caneca', preco: 3990, estoque: 10, ...dados },
  })
  if (status !== 201) throw new Error(`não criou o produto: ${JSON.stringify(corpo)}`)
  return corpo
}

let emails = 0

export async function criarCliente(ctx: Contexto, dados: Record<string, unknown> = {}) {
  const { status, corpo } = await ctx.pedir({
    method: 'POST',
    url: '/clientes',
    payload: { nome: 'Ana', email: `cliente${++emails}@exemplo.com`, ...dados },
  })
  if (status !== 201) throw new Error(`não criou o cliente: ${JSON.stringify(corpo)}`)
  return corpo
}

export async function criarPedido(ctx: Contexto, payload: Record<string, unknown>) {
  return ctx.pedir({ method: 'POST', url: '/pedidos', payload })
}
