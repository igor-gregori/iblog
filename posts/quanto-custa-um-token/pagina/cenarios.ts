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
