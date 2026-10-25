// As duas buscas do RAG e a junção delas. Repete `analise/busca.py`; os testes conferem os dois lados.

// As palavras que aparecem em quase todo texto em português e não ajudam a achar nada.
const PALAVRAS_VAZIAS = new Set(
  `a o as os um uma uns umas de do da dos das em no na nos nas num numa por pelo pela pelos pelas para pra com sem
  e ou que se como mais menos ao aos ser sao foi era eh esta este isso isto esse essa ele ela eles elas seu sua
  seus suas meu minha qual quais quando onde porque quem cada tem ter ja nao sim mas so tambem entre ate sobre`.split(/\s+/),
)

// Os parâmetros de costume do BM25: k1 limita o peso de uma palavra repetida; b, o desconto pelo tamanho.
const K1 = 1.2
const B = 0.75

/** A constante da reciprocal rank fusion. */
export const K_RRF = 60

/** As palavras do texto como a busca as compara: sem acento, em minúsculas, sem as vazias e sem o plural em s. */
export function termos(texto: string): string[] {
  const palavras = texto.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase().match(/[a-z0-9]+/g) ?? []
  return palavras.filter((p) => !PALAVRAS_VAZIAS.has(p)).map((p) => (p.length > 3 && p.endsWith('s') ? p.slice(0, -1) : p))
}

function contagem(palavras: string[]): Map<string, number> {
  const resultado = new Map<string, number>()
  for (const p of palavras) resultado.set(p, (resultado.get(p) ?? 0) + 1)
  return resultado
}

/** O índice da busca por palavras: quantas vezes cada palavra aparece em cada pedaço. */
export function criarIndice(textos: string[]) {
  const contagens = textos.map((t) => contagem(termos(t)))
  const tamanhos = contagens.map((c) => [...c.values()].reduce((a, b) => a + b, 0))
  const media = tamanhos.reduce((a, b) => a + b, 0) / tamanhos.length
  // Em quantos pedaços cada palavra aparece.
  const frequencia = new Map<string, number>()
  for (const c of contagens) for (const palavra of c.keys()) frequencia.set(palavra, (frequencia.get(palavra) ?? 0) + 1)

  /** A nota de cada pedaço para a pergunta, na ordem dos pedaços. */
  return function notas(pergunta: string): number[] {
    const n = contagens.length
    const palavras = [...new Set(termos(pergunta))]
    return contagens.map((c, i) => {
      let nota = 0
      for (const palavra of palavras) {
        const vezes = c.get(palavra) ?? 0
        if (!vezes) continue
        const em = frequencia.get(palavra)!
        const raridade = Math.log(1 + (n - em + 0.5) / (em + 0.5))
        nota += (raridade * vezes * (K1 + 1)) / (vezes + K1 * (1 - B + (B * tamanhos[i]) / media))
      }
      return nota
    })
  }
}

/** O cosseno do ângulo entre dois vetores: 1 quando apontam para o mesmo lado. */
export function cosseno(a: number[], b: number[]): number {
  let produto = 0
  let normaA = 0
  let normaB = 0
  for (let i = 0; i < a.length; i++) {
    produto += a[i] * b[i]
    normaA += a[i] * a[i]
    normaB += b[i] * b[i]
  }
  return produto / (Math.sqrt(normaA) * Math.sqrt(normaB))
}

/** Os pedaços da maior nota para a menor; no empate, o que vem antes no corpus. */
export function ordem(notas: number[]): number[] {
  return notas.map((_, i) => i).sort((i, j) => notas[j] - notas[i] || i - j)
}

/** Junta várias listas de pedaços pela posição: cada lista dá 1 / (60 + posição) aos seus `limite` primeiros. */
export function fusao(listas: number[][], limite: number): number[] {
  const notas = new Map<number, number>()
  for (const lista of listas) {
    lista.slice(0, limite).forEach((pedaco, i) => notas.set(pedaco, (notas.get(pedaco) ?? 0) + 1 / (K_RRF + i + 1)))
  }
  return [...notas.keys()].sort((p, q) => notas.get(q)! - notas.get(p)! || p - q)
}
