import { numero } from '#base/formato.ts'

export interface Cenario {
  nome: string
  entrada: number
  saida: number
  fracaoEmCache: number
}

/** Três pedidos típicos, para o leitor não começar do zero: uma pergunta no chat, um passo de um agente de código
    e o resumo de um documento longo. */
export const CENARIOS: Record<'chat' | 'agente' | 'documento', Cenario> = {
  chat: { nome: 'Chat', entrada: 2_000, saida: 600, fracaoEmCache: 0 },
  agente: { nome: 'Agente', entrada: 60_000, saida: 1_500, fracaoEmCache: 0.9 },
  documento: { nome: 'Documento', entrada: 90_000, saida: 2_000, fracaoEmCache: 0 },
}

export type Chave = keyof typeof CENARIOS

/** Dólares, com casas que dependem do tamanho: US$ 0,450; US$ 12,50; US$ 1.075. */
export function dolares(valor: number): string {
  const casas = valor >= 100 ? 0 : valor >= 1 ? 2 : 3
  return `US$ ${numero(valor, casas)}`
}
