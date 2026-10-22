// A tarefa da parte 1: os blocos do pedido de cada chamada do laço.

export interface Bloco {
  nome: string
  tokens: number
}

export interface Passo {
  /** O que entra no histórico antes desta chamada. */
  entra: Bloco[]
  /** O que o modelo responde, e que entra no histórico da chamada seguinte. */
  responde: Bloco
}

// A tarefa do laço do primeiro post da série ("O teste de calcularFrete está falhando. Corrija."), com tamanhos
// ilustrativos. O começo (ferramentas, instruções e CLAUDE.md) tem o tamanho do começo da sessão simulada.
const COMECO: Bloco[] = [
  { nome: 'Descrição das ferramentas', tokens: 10_000 },
  { nome: 'Instruções do harness', tokens: 8_000 },
  { nome: 'CLAUDE.md do projeto', tokens: 2_000 },
]

export const PASSOS: Passo[] = [
  { entra: [...COMECO, { nome: 'Seu pedido', tokens: 30 }], responde: { nome: 'Modelo pede: npm test', tokens: 60 } },
  { entra: [{ nome: 'Saída do npm test: 1 teste falhando', tokens: 900 }], responde: { nome: 'Modelo pede: ler src/frete.ts', tokens: 50 } },
  { entra: [{ nome: 'Conteúdo de src/frete.ts', tokens: 1_800 }], responde: { nome: 'Modelo pede: editar src/frete.ts', tokens: 250 } },
  { entra: [{ nome: 'Resultado da edição', tokens: 40 }], responde: { nome: 'Modelo pede: npm test', tokens: 60 } },
  { entra: [{ nome: 'Saída do npm test: tudo passando', tokens: 300 }], responde: { nome: 'Resposta final para você', tokens: 150 } },
]

/**
 * O que a chamada `n` (a partir de 1) manda: o pedido da chamada anterior e, depois, o que é novo (a resposta
 * anterior e o que entrou desde então). Com o cache, é o novo que se grava.
 */
export function pedido(n: number) {
  const anteriores = PASSOS.slice(0, Math.max(n - 2, 0)).flatMap((passo) => [...passo.entra, passo.responde])
  if (n === 1) return { anteriores, novos: PASSOS[0].entra }
  return { anteriores: [...anteriores, ...PASSOS[n - 2].entra], novos: [PASSOS[n - 2].responde, ...PASSOS[n - 1].entra] }
}

/** Os números da tarefa, para o texto: o que ela acrescentou de novo e quanto o modelo leu nas cinco chamadas. */
export function numerosDaTarefa() {
  const total = (blocos: Bloco[]) => blocos.reduce((soma, bloco) => soma + bloco.tokens, 0)
  const entradas = PASSOS.map((_, i) => {
    const { anteriores, novos } = pedido(i + 1)
    return total(anteriores) + total(novos)
  })
  return {
    chamadas: PASSOS.length,
    comeco: total(COMECO),
    primeira: entradas[0],
    ultima: entradas[entradas.length - 1],
    lidos: entradas.reduce((a, b) => a + b, 0),
    novos: total(PASSOS.flatMap((passo) => [...passo.entra, passo.responde])),
  }
}
