// Ajuda dos testes escondidos. É copiada para `teste-oculto/ajuda.ts` na cópia do projeto, depois que o agente
// terminou, e só depende de `criarApp` (o resto do projeto o agente pode ter mudado à vontade).
import type { InjectOptions } from 'fastify'
import { criarApp } from '../src/app.ts'

export class Relogio {
  atual = new Date('2026-03-01T12:00:00Z')

  agora = (): Date => new Date(this.atual)

  avancarDias(dias: number): void {
    this.atual = new Date(this.atual.getTime() + dias * 24 * 60 * 60 * 1000)
  }

  irPara(iso: string): void {
    this.atual = new Date(iso)
  }
}

export type Resposta = { status: number; corpo: any }

export type Contexto = {
  relogio: Relogio
  pedir: (opcoes: InjectOptions) => Promise<Resposta>
  get: (url: string) => Promise<Resposta>
  post: (url: string, payload?: unknown, headers?: Record<string, string>) => Promise<Resposta>
  patch: (url: string, payload: unknown) => Promise<Resposta>
}

export function montar(): Contexto {
  const relogio = new Relogio()
  const app = criarApp({ agora: relogio.agora })
  const pedir = async (opcoes: InjectOptions): Promise<Resposta> => {
    const resposta = await app.inject(opcoes)
    let corpo: unknown
    try {
      corpo = resposta.body ? resposta.json() : undefined
    } catch {
      corpo = resposta.body
    }
    return { status: resposta.statusCode, corpo }
  }
  return {
    relogio,
    pedir,
    get: (url) => pedir({ method: 'GET', url }),
    post: (url, payload, headers) => pedir({ method: 'POST', url, payload: payload as any, headers }),
    patch: (url, payload) => pedir({ method: 'PATCH', url, payload: payload as any }),
  }
}

export async function produto(ctx: Contexto, dados: Record<string, unknown> = {}) {
  const { status, corpo } = await ctx.post('/produtos', { nome: 'Caneca', preco: 3990, estoque: 10, ...dados })
  if (status !== 201) throw new Error(`não criou o produto: ${JSON.stringify(corpo)}`)
  return corpo
}

let emails = 0

export async function cliente(ctx: Contexto) {
  const { status, corpo } = await ctx.post('/clientes', { nome: 'Ana', email: `oculto${++emails}@exemplo.com` })
  if (status !== 201) throw new Error(`não criou o cliente: ${JSON.stringify(corpo)}`)
  return corpo
}

export async function estoque(ctx: Contexto, produtoId: number): Promise<number> {
  return (await ctx.get(`/produtos/${produtoId}`)).corpo.estoque
}

/** Uma resposta de erro do cliente (4xx), em qualquer código: os testes óbvios não cobram o código exato. */
export function ehErroDoCliente(status: number): boolean {
  return status >= 400 && status < 500
}

/**
 * Uma recusa de quem existe: 4xx, mas não 404 nem 405. Para os casos em que o recurso existe e a rota também, e um 404
 * só sairia de uma rota que ninguém escreveu.
 */
export function ehRecusa(status: number): boolean {
  return ehErroDoCliente(status) && status !== 404 && status !== 405
}
