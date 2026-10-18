// O modelo de brinquedo da parte 2: conta, no texto de treino, qual token veio depois de cada par de tokens.
// Um modelo de verdade olha o contexto inteiro e aprende pesos em vez de contar, mas a pergunta é a mesma:
// dado o que veio antes, qual é o próximo token?

/** Quebra o código em tokens: nomes, números, textos entre aspas e cada sinal sozinho. */
export function tokens(texto: string): string[] {
  return texto.match(/[A-Za-z_][A-Za-z0-9_]*|\d+|'[^']*'|\S/g) ?? []
}

export type Contagens = Map<string, Map<string, number>>

/** Para cada par de tokens seguidos, quantas vezes cada token veio logo depois. */
export function treinar(texto: string): Contagens {
  const lista = tokens(texto)
  const contagens: Contagens = new Map()
  for (let i = 2; i < lista.length; i++) {
    const contexto = `${lista[i - 2]} ${lista[i - 1]}`
    const seguintes = contagens.get(contexto) ?? new Map<string, number>()
    seguintes.set(lista[i], (seguintes.get(lista[i]) ?? 0) + 1)
    contagens.set(contexto, seguintes)
  }
  return contagens
}

export interface Previsao {
  token: string
  vezes: number
  /** A fração das vezes em que esse token veio depois do contexto. */
  chance: number
}

/** Os próximos tokens possíveis depois de um contexto, do mais provável ao menos. */
export function prever(contagens: Contagens, contexto: string): Previsao[] {
  const seguintes = [...(contagens.get(contexto) ?? new Map<string, number>())]
  const total = seguintes.reduce((soma, [, vezes]) => soma + vezes, 0)
  return seguintes
    .map(([token, vezes]) => ({ token, vezes, chance: vezes / total }))
    .sort((a, b) => b.vezes - a.vezes || a.token.localeCompare(b.token))
}
